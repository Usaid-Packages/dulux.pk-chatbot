import logging

from datetime import timedelta

from constance import config
from django.utils import timezone

from dulux_chatbot.chatbot.choices import FlowType
from dulux_chatbot.chatbot.constants import (
    ASSURANCE_CLAIM_ID,
    ASSURANCE_MENU_BUTTONS,
    ASSURANCE_MENU_TEXT,
    ASSURANCE_REGISTRATION_ID,
    ASSURANCE_REISSUANCE_ID,
    MAIN_MENU_BUTTONS,
    MAIN_MENU_COMPLAINT_ID,
    MAIN_MENU_DULUX_ASSURANCE_ID,
    MAIN_MENU_FIND_PRODUCT_ID,
    MAIN_MENU_TEXT,
)
from dulux_chatbot.chatbot.flows.claim import ClaimFlow
from dulux_chatbot.chatbot.flows.claim_resubmission import ClaimResubmissionFlow
from dulux_chatbot.chatbot.flows.complaint import ComplaintFlow
from dulux_chatbot.chatbot.flows.find_product import FindProductFlow
from dulux_chatbot.chatbot.flows.registration import RegistrationFlow
from dulux_chatbot.chatbot.flows.reissuance import ReissuanceFlow
from dulux_chatbot.chatbot.services.sessions import reset_whatsapp_session_to_main_menu
from dulux_chatbot.chatbot.services.whatsapp_client import WhatsAppAPIError
from dulux_chatbot.chatbot.services.whatsapp_flows import (
    WhatsAppFlowCompletionService,
    build_flow_token,
    get_flow_id,
    get_flow_name,
)
from dulux_chatbot.chatbot.tasks import send_whatsapp_main_menu
from dulux_chatbot.complaints.models import Complaint
from dulux_chatbot.warranty.resubmission import fallback_resubmit_message


logger = logging.getLogger("dulux_chatbot")
COMPLAINT_CONTEXT_REMINDER_AFTER = timedelta(hours=1)
MENU_OPTIONS = {
    "1": FlowType.REGISTRATION,
    "2": FlowType.CLAIM,
    "3": FlowType.FIND_PRODUCT,
    "4": FlowType.COMPLAINT,
    "5": FlowType.REISSUANCE,
    ASSURANCE_REGISTRATION_ID: FlowType.REGISTRATION,
    ASSURANCE_CLAIM_ID: FlowType.CLAIM,
    ASSURANCE_REISSUANCE_ID: FlowType.REISSUANCE,
    MAIN_MENU_FIND_PRODUCT_ID: FlowType.FIND_PRODUCT,
    MAIN_MENU_COMPLAINT_ID: FlowType.COMPLAINT,
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

FLOW_START_SCREENS = {
    FlowType.REGISTRATION: "CONSENT",
    FlowType.CLAIM: "REGISTRATION_LOOKUP",
    FlowType.FIND_PRODUCT: "SELECT_ENVIRONMENT",
    FlowType.COMPLAINT: "COMPLAINT_DETAILS",
    FlowType.REISSUANCE: "PHONE_LOOKUP",
}


def dispatch(session, message: dict, client) -> None:
    now = timezone.now()
    if message.get("flow_response"):
        _handle_flow_response(session=session, message=message, client=client)
        return

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
        selected_option = (message.get("interactive_id") or message.get("text") or "").strip()
        if selected_option == MAIN_MENU_DULUX_ASSURANCE_ID:
            _send_assurance_menu(session.phone_number, client)
            return

        selected_flow = MENU_OPTIONS.get(selected_option)
        if selected_flow is None:
            _send_main_menu(session.phone_number, client)
            return
        _start_flow(session=session, selected_flow=selected_flow, client=client)
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
    if hasattr(client, "send_interactive_buttons"):
        try:
            client.send_interactive_buttons(phone_number, MAIN_MENU_TEXT, MAIN_MENU_BUTTONS)
            return
        except WhatsAppAPIError:
            pass
    client.send_text(phone_number, MAIN_MENU_TEXT)


def _send_assurance_menu(phone_number: str, client) -> None:
    if hasattr(client, "send_interactive_buttons"):
        try:
            client.send_interactive_buttons(phone_number, ASSURANCE_MENU_TEXT, ASSURANCE_MENU_BUTTONS)
            return
        except WhatsAppAPIError:
            pass
    client.send_text(phone_number, "1. Warranty Registration\n2. Warranty Claim\n5. Certificate Reissuance")


def _start_flow(*, session, selected_flow: str, client) -> None:
    if _send_meta_flow(session=session, selected_flow=selected_flow, client=client):
        session.flow = None
        session.current_step = "menu"
        session.session_data = {}
        session.save(update_fields=["flow", "current_step", "session_data", "modified"])
        return

    session.flow = selected_flow
    session.current_step = FLOW_INITIAL_STEPS[selected_flow]
    session.session_data = {}
    session.save(update_fields=["flow", "current_step", "session_data", "modified"])
    FLOW_CLASSES[selected_flow](session=session, client=client).send_initial_prompt()


def _send_meta_flow(*, session, selected_flow: str, client) -> bool:
    flow_id = get_flow_id(selected_flow)
    if not flow_id:
        logger.warning("WhatsApp Flow ID missing; falling back to text flow.", extra={"flow": selected_flow})
        return False
    if not hasattr(client, "send_flow"):
        logger.warning(
            "WhatsApp client has no send_flow method; falling back to text flow.", extra={"flow": selected_flow}
        )
        return False

    flow_name = get_flow_name(selected_flow)
    try:
        client.send_flow(
            session.phone_number,
            body=f"Please complete the {flow_name} form.",
            flow_id=flow_id,
            flow_token=build_flow_token(selected_flow),
            flow_cta="Open",
            screen=FLOW_START_SCREENS.get(selected_flow),
            data={"flow_name": flow_name},
        )
    except WhatsAppAPIError:
        logger.exception(
            "WhatsApp Flow message failed; falling back to text flow.",
            extra={"flow": selected_flow, "flow_name": flow_name},
        )
        return False
    logger.info("WhatsApp Flow message sent.", extra={"flow": selected_flow, "flow_name": flow_name})
    return True


def _handle_flow_response(*, session, message: dict, client) -> None:
    response_data = message.get("flow_response") or {}
    flow_type = WhatsAppFlowCompletionService.detect_response_flow_type(response_data)
    handled = WhatsAppFlowCompletionService.complete(
        phone_number=session.phone_number,
        response_data=response_data,
        client=client,
    )
    if not handled:
        _send_main_menu(session.phone_number, client)
        return

    if flow_type == FlowType.COMPLAINT:
        complaint = Complaint.objects.filter(phone_number=session.phone_number).order_by("-created").first()
        session.flow = FlowType.COMPLAINT
        session.current_step = "chat"
        session.session_data = {"complaint_id": complaint.id} if complaint else {}
        session.last_activity = timezone.now()
        session.save(update_fields=["flow", "current_step", "session_data", "last_activity", "modified"])
        return

    reset_whatsapp_session_to_main_menu(phone_number=session.phone_number)
    send_whatsapp_main_menu.apply_async(args=[session.phone_number, MAIN_MENU_TEXT], countdown=2)


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
