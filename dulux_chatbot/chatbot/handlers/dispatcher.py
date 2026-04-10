from datetime import timedelta

from constance import config
from django.utils import timezone

from dulux_chatbot.chatbot.choices import FlowType
from dulux_chatbot.chatbot.flows.claim import ClaimFlow
from dulux_chatbot.chatbot.flows.claim_resubmission import ClaimResubmissionFlow
from dulux_chatbot.chatbot.flows.complaint import ComplaintFlow
from dulux_chatbot.chatbot.flows.find_product import FindProductFlow
from dulux_chatbot.chatbot.flows.registration import RegistrationFlow
from dulux_chatbot.chatbot.flows.reissuance import ReissuanceFlow
from dulux_chatbot.warranty.resubmission import fallback_resubmit_message


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


def dispatch(session, message: dict, client) -> None:
    now = timezone.now()
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
    client.send_text(
        phone_number,
        (
            "How can I assist you? Reply with:\n"
            "1. Warranty Registration\n"
            "2. Warranty Claim\n"
            "3. Find a Product\n"
            "4. Raise a Complaint\n"
            "5. Certificate Reissuance"
        ),
    )


def _session_expired(*, session, now) -> bool:
    if session.flow is None:
        return False
    last_activity = session.last_activity
    if last_activity is None:
        return False
    return now - last_activity > timedelta(minutes=config.WHATSAPP_SESSION_TIMEOUT_MINUTES)
