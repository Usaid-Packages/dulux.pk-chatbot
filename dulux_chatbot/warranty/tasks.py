import logging
import re

from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from dulux_chatbot.chatbot.models import WhatsAppSession
from dulux_chatbot.chatbot.services.whatsapp_client import WhatsAppClient
from dulux_chatbot.warranty.choices import ClaimState, QualityDecisionType, QualityRequiredItem, RegistrationState
from dulux_chatbot.warranty.models import WarrantyClaim, WarrantyRegistration
from dulux_chatbot.warranty.resubmission import (
    build_resubmit_steps,
    fallback_resubmit_message,
    get_resubmission_field_label,
    initial_resubmit_session_data,
    resubmit_flow_type,
)
from dulux_chatbot.warranty.services.certificate import generate_warranty_certificate


logger = logging.getLogger("dulux_chatbot")
HTML_TAG_RE = re.compile(r"<[^>]+>")


@shared_task
def generate_and_send_certificate(registration_id: int) -> None:
    registration = WarrantyRegistration.objects.prefetch_related("paint_pairs__topcoat", "paint_pairs__basecoat").get(
        pk=registration_id
    )
    content = generate_warranty_certificate(registration)
    registration.warranty_certificate.save(content.name, content, save=True)


@shared_task
def send_whatsapp_status_notification(phone: str, message: str) -> None:
    WhatsAppClient().send_text(phone, message)


def _ensure_registration_certificate(registration: WarrantyRegistration) -> WarrantyRegistration:
    if registration.warranty_certificate:
        return registration

    content = generate_warranty_certificate(registration)
    registration.warranty_certificate.save(content.name, content, save=True)
    registration.refresh_from_db(fields=["warranty_certificate"])
    return registration


def _build_notification_content(*, registration: WarrantyRegistration, notification_template: str) -> dict:
    email_html = notification_template.strip()
    email_text = HTML_TAG_RE.sub(" ", email_html)
    email_text = re.sub(r"\s+", " ", email_text).strip()
    if registration.state == RegistrationState.APPROVED:
        email_subject = "Your Dulux Assurance Warranty registration has been approved"
    else:
        email_subject = "Your Dulux Assurance Warranty registration has been rejected"

    return {
        "email_subject": email_subject,
        "email_text": email_text,
        "email_html": email_html,
        "whatsapp_message": _build_registration_status_whatsapp_message(registration=registration),
    }


def _build_registration_status_whatsapp_message(*, registration: WarrantyRegistration) -> str:
    status_label = "approved" if registration.state == RegistrationState.APPROVED else "rejected"
    return f"Your Warranty registration: {registration.registration_code} is {status_label}."


def _build_claim_status_whatsapp_message(*, claim: WarrantyClaim) -> str:
    status_label = "approved" if claim.state == ClaimState.APPROVED else "rejected"
    return f"Your claim for registration: {claim.registration.registration_code} is {status_label}."


@shared_task
def send_registration_status_notification(registration_id: int, notification_template: str | None = None) -> None:
    registration = WarrantyRegistration.objects.prefetch_related("paint_pairs__topcoat", "paint_pairs__basecoat").get(
        pk=registration_id
    )
    if registration.state not in {RegistrationState.APPROVED, RegistrationState.REJECTED}:
        logger.warning("Registration status notification skipped for unsupported state.", extra={"id": registration_id})
        return
    if not isinstance(notification_template, str) or not notification_template.strip():
        logger.warning(
            "Registration status notification skipped due to missing email HTML.", extra={"id": registration_id}
        )
        return

    registration = _ensure_registration_certificate(registration)
    notification_content = _build_notification_content(
        registration=registration,
        notification_template=notification_template,
    )

    email = EmailMultiAlternatives(
        subject=notification_content["email_subject"],
        body=notification_content["email_text"],
        to=[registration.email],
    )
    email.attach_alternative(notification_content["email_html"], "text/html")

    registration.warranty_certificate.open("rb")
    try:
        email.attach("warranty_certificate.pdf", registration.warranty_certificate.read(), "application/pdf")
    finally:
        registration.warranty_certificate.close()
    email.send(fail_silently=False)

    whatsapp_message = notification_content["whatsapp_message"]
    client = WhatsAppClient()
    client.send_text(registration.phone_number, whatsapp_message)
    client.send_document(
        registration.phone_number,
        registration.warranty_certificate.url,
        "warranty_certificate.pdf",
        caption="warranty_certificate.pdf",
    )


@shared_task
def send_claim_status_notification(claim_id: int, notification_template: str | None = None) -> None:
    claim = WarrantyClaim.objects.select_related("registration").get(pk=claim_id)
    if claim.state not in {ClaimState.APPROVED, ClaimState.REJECTED}:
        logger.warning("Claim status notification skipped for unsupported state.", extra={"id": claim_id})
        return
    if not isinstance(notification_template, str) or not notification_template.strip():
        logger.warning("Claim status notification skipped due to missing email HTML.", extra={"id": claim_id})
        return
    if claim.state == ClaimState.APPROVED and not claim.voucher:
        logger.warning("Claim approval notification skipped due to missing voucher.", extra={"id": claim_id})
        return

    email_html = notification_template.strip()
    email_text = HTML_TAG_RE.sub(" ", email_html)
    email_text = re.sub(r"\s+", " ", email_text).strip()
    email_subject = (
        "Your Dulux Assurance claim has been approved"
        if claim.state == ClaimState.APPROVED
        else "Your Dulux Assurance claim has been rejected"
    )

    email = EmailMultiAlternatives(
        subject=email_subject,
        body=email_text,
        to=[claim.registration.email],
    )
    email.attach_alternative(email_html, "text/html")

    if claim.state == ClaimState.APPROVED and claim.voucher:
        claim.voucher.open("rb")
        try:
            email.attach("claim_voucher.pdf", claim.voucher.read(), "application/pdf")
        finally:
            claim.voucher.close()

    email.send(fail_silently=False)

    whatsapp_message = _build_claim_status_whatsapp_message(claim=claim)
    client = WhatsAppClient()
    client.send_text(claim.registration.phone_number, whatsapp_message)
    if claim.state == ClaimState.APPROVED and claim.voucher:
        client.send_document(
            claim.registration.phone_number,
            claim.voucher.url,
            "claim_voucher.pdf",
            caption="claim_voucher.pdf",
        )


@shared_task
def send_registration_resubmit_notification(registration_id: int) -> None:
    from dulux_chatbot.chatbot.flows.registration import RegistrationFlow

    registration = WarrantyRegistration.objects.prefetch_related("rejection_fields", "paint_pairs", "invoices").get(
        pk=registration_id
    )
    rejection_items = list(registration.rejection_fields.order_by("field_name", "id"))
    rejected_field_names = [item.field_name for item in rejection_items if item.field_name]
    resubmit_steps, unsupported_fields = build_resubmit_steps(rejected_field_names)
    fallback_message = fallback_resubmit_message()
    display_rejection_fields = [
        {
            "field_name": item.field_name,
            "display_name": get_resubmission_field_label(item.field_name),
            "note": item.note,
        }
        for item in rejection_items
    ]

    message_context = {
        "registration": registration,
        "rejection_fields": display_rejection_fields,
        "unsupported_fields": unsupported_fields,
        "fallback_message": fallback_message,
    }
    whatsapp_message = render_to_string("warranty/resubmission_notification.txt", message_context).strip()
    email_subject = render_to_string("warranty/email/registration_resubmit_subject.txt", message_context).strip()
    email_text = render_to_string("warranty/email/registration_resubmit_message.txt", message_context)
    email_html = render_to_string("warranty/email/registration_resubmit_message.html", message_context)

    email = EmailMultiAlternatives(
        subject=email_subject,
        body=email_text,
        to=[registration.email],
    )
    email.attach_alternative(email_html, "text/html")
    email.send(fail_silently=False)

    client = WhatsAppClient()
    client.send_text(registration.phone_number, whatsapp_message)

    if not resubmit_steps:
        client.send_text(registration.phone_number, fallback_message)
        return

    session, _ = WhatsAppSession.objects.get_or_create(phone_number=registration.phone_number)
    session_data = initial_resubmit_session_data(registration=registration)
    session_data.update(
        {
            "resubmit_registration_id": registration.id,
            "resubmit_steps": resubmit_steps,
            "resubmit_step_index": 0,
            "resubmit_unsupported_fields": unsupported_fields,
            "resubmit_notes": registration.notes,
        }
    )
    if "topcoat_select" in resubmit_steps:
        session_data["paint_pairs"] = []
    if "invoice_upload" in resubmit_steps:
        session_data["paint_pair_invoices"] = []

    session.flow = resubmit_flow_type()
    session.current_step = resubmit_steps[0]
    session.session_data = session_data
    session.save(update_fields=["flow", "current_step", "session_data", "last_activity", "modified"])

    RegistrationFlow(session=session, client=client).send_prompt()


@shared_task
def send_claim_resubmit_notification(claim_id: int) -> None:
    from dulux_chatbot.chatbot.choices import FlowType
    from dulux_chatbot.chatbot.flows.claim_resubmission import ClaimResubmissionFlow

    claim = (
        WarrantyClaim.objects.select_related("registration")
        .prefetch_related("quality_reviews__required_items")
        .get(pk=claim_id)
    )
    latest_quality_review = (
        claim.quality_reviews.filter(decision_type=QualityDecisionType.REQUEST_INFO).order_by("-created", "-id").first()
    )
    if latest_quality_review is None:
        logger.warning(
            "Claim resubmit notification skipped due to missing request info review.", extra={"id": claim_id}
        )
        return

    requested_items = list(latest_quality_review.required_items.order_by("created", "id"))
    item_labels = [_get_quality_required_item_label(item.required_item) for item in requested_items]
    message_lines = [
        f"Additional information is needed for your claim for registration no: {claim.registration.registration_code}.",
        "Please reply in WhatsApp with the requested details below:",
    ]
    message_lines.extend(f"- {label}" for label in item_labels)
    if latest_quality_review.other_text:
        message_lines.append(f"- Other: {latest_quality_review.other_text}")
    if latest_quality_review.notes:
        message_lines.append(f"Notes: {latest_quality_review.notes}")
    message_lines.append("You may also share these details with CSR through a complaint conversation if needed.")

    client = WhatsAppClient()
    client.send_text(claim.registration.phone_number, "\n".join(message_lines))

    session, _ = WhatsAppSession.objects.get_or_create(phone_number=claim.registration.phone_number)
    session.flow = FlowType.CLAIM_RESUBMISSION
    session.current_step = "claim_resubmission_item"
    session.session_data = {
        "claim_resubmission_claim_id": claim.id,
        "claim_resubmission_review_id": latest_quality_review.id,
        "claim_resubmission_items": [item.required_item for item in requested_items],
        "claim_resubmission_item_index": 0,
        "claim_resubmission_entries": [],
        "claim_resubmission_current_images": [],
        "claim_resubmission_other_text": latest_quality_review.other_text,
    }
    session.save(update_fields=["flow", "current_step", "session_data", "last_activity", "modified"])
    ClaimResubmissionFlow(session=session, client=client).send_prompt()


def _get_quality_required_item_label(required_item: str) -> str:
    try:
        return QualityRequiredItem(required_item).label
    except ValueError:
        return required_item.replace("_", " ").title()
