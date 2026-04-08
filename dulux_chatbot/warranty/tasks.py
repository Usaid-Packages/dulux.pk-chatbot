import logging
import re

from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from dulux_chatbot.chatbot.models import WhatsAppSession
from dulux_chatbot.chatbot.services.whatsapp_client import WhatsAppClient
from dulux_chatbot.warranty.choices import RegistrationState
from dulux_chatbot.warranty.models import WarrantyRegistration
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
        caption=whatsapp_message,
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
