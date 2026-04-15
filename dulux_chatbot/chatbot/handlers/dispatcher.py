from datetime import timedelta

from constance import config
from django.utils import timezone

from dulux_chatbot.chatbot.choices import FlowType
from dulux_chatbot.chatbot.constants import MAIN_MENU_TEXT
from dulux_chatbot.chatbot.flows.claim import ClaimFlow
from dulux_chatbot.chatbot.flows.claim_resubmission import ClaimResubmissionFlow
from dulux_chatbot.chatbot.flows.complaint import ComplaintFlow
from dulux_chatbot.chatbot.flows.find_product import FindProductFlow
from dulux_chatbot.chatbot.flows.registration import RegistrationFlow
from dulux_chatbot.chatbot.flows.reissuance import ReissuanceFlow
from dulux_chatbot.chatbot.services.sessions import reset_whatsapp_session_to_main_menu
from dulux_chatbot.complaints.models import Complaint
from dulux_chatbot.warranty.resubmission import fallback_resubmit_message


COMPLAINT_CONTEXT_REMINDER_AFTER = timedelta(hours=1)
MENU_OPTIONS = {
    "1": FlowType.REGISTRATION,
    "2": FlowType.CLAIM,
    "3": FlowType.FIND_PRODUCT,
    "4": FlowType.COMPLAINT,
    "5": FlowType.REISSUANCE,
}

FLOW_CLASSES = {
    FlowType.REGISTRATION: RegistrationFlow,
    FlowType.CLAIM: ClaimFlow,
    FlowType.CLAIM_RESUBMISSION: ClaimResubmissionFlow,
    FlowType.FIND_PRODUCT: FindProductFlow,
    FlowType.COMPLAINT: ComplaintFlow,
    FlowType.REISSUANCE: ReissuanceFlow,
}

FLOW_INITIAL_STEPS = {
    FlowType.REGISTRATION: "consent",
    FlowType.CLAIM: "registration_lookup",
    FlowType.CLAIM_RESUBMISSION: "claim_resubmission_item",
    FlowType.FIND_PRODUCT: "interior_exterior_select",
    FlowType.COMPLAINT: "subject",
    FlowType.REISSUANCE: "phone_lookup",
}


# TODO(audit C3): Concurrent webhook deliveries for the same phone number race on
# session state. Meta retries and rapid user taps cause parallel dispatch() calls
# that read stale state and overwrite each other's save() — flow can advance twice
# or land in an inconsistent (flow, current_step) combination. Serialize per-phone
# via `with transaction.atomic(): WhatsAppSession.objects.select_for_update().get(pk=session.pk)`
# around the body below, or a Redis lock per phone_number.
def dispatch(session, message: dict, client) -> None:
    now = timezone.now()
    if _is_main_menu_command(message):
        reset_whatsapp_session_to_main_menu(phone_number=session.phone_number)
        session.refresh_from_db(fields=["flow", "current_step", "session_data", "last_activity"])
        _send_main_menu(session.phone_number, client)
        return

    if _session_expired(session=session, now=now):
        expired_resubmit_session = bool((session.session_data or {}).get("resubmit_registration_id"))
        expired_claim_resubmit_session = bool((session.session_data or {}).get("claim_resubmission_claim_id"))
        session.flow = None
        session.current_step = "menu"
        session.session_data = {}
        session.last_activity = now
        session.save(update_fields=["flow", "current_step", "session_data", "last_activity", "modified"])
        if expired_resubmit_session:
            client.send_text(session.phone_number, fallback_resubmit_message())
        elif expired_claim_resubmit_session:
            client.send_text(
                session.phone_number,
                "Your claim resubmission session expired. Please wait for a fresh request or contact CSR for help.",
            )
        _send_main_menu(session.phone_number, client)
        return

    if _should_send_complaint_context_reminder(session=session, now=now):
        _send_complaint_context_reminder(session=session, client=client)

    session.last_activity = now
    session.save(update_fields=["last_activity", "modified"])

    if session.flow is None:
        selected_flow = MENU_OPTIONS.get((message.get("interactive_id") or message.get("text") or "").strip())
        if selected_flow is None:
            _send_main_menu(session.phone_number, client)
            return
        session.flow = selected_flow
        session.current_step = FLOW_INITIAL_STEPS[selected_flow]
        session.session_data = {}
        session.save(update_fields=["flow", "current_step", "session_data", "modified"])
        FLOW_CLASSES[selected_flow](session=session, client=client).send_initial_prompt()
        return

    flow_class = FLOW_CLASSES.get(session.flow)
    if flow_class is None:
        _send_main_menu(session.phone_number, client)
        session.flow = None
        session.current_step = "menu"
        session.session_data = {}
        session.save(update_fields=["flow", "current_step", "session_data", "modified"])
        return

    flow_class(session=session, client=client).handle(message)


def _send_main_menu(phone_number: str, client) -> None:
    client.send_text(phone_number, MAIN_MENU_TEXT)


def _is_main_menu_command(message: dict) -> bool:
    command = str(message.get("interactive_id") or message.get("text") or "").strip()
    return command == "00" or command.upper() in {"MENU", "MAIN MENU"}


def _should_send_complaint_context_reminder(*, session, now) -> bool:
    if session.flow != FlowType.COMPLAINT or session.current_step != "chat":
        return False
    if session.last_activity is None:
        return False
    return now - session.last_activity > COMPLAINT_CONTEXT_REMINDER_AFTER


def _send_complaint_context_reminder(*, session, client) -> None:
    complaint_id = (session.session_data or {}).get("complaint_id")
    complaint = Complaint.objects.filter(pk=complaint_id).only("subject").first()
    subject = complaint.subject if complaint is not None else "your complaint"
    client.send_text(
        session.phone_number,
        (
            f"You are currently in the complaint chat for subject: {subject}. "
            "If you want to go to the main menu, press 00 or type MAIN MENU."
        ),
    )


def _session_expired(*, session, now) -> bool:
    if session.flow is None:
        return False
    last_activity = session.last_activity
    if last_activity is None:
        return False
    timeout = (
        timedelta(minutes=config.WHATSAPP_COMPLAINT_SESSION_TIMEOUT_MINUTES)
        if session.flow == FlowType.COMPLAINT
        else timedelta(minutes=config.WHATSAPP_SESSION_TIMEOUT_MINUTES)
    )
    return now - last_activity > timeout
