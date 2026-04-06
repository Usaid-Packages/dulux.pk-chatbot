from dulux_chatbot.chatbot.choices import FlowType
from dulux_chatbot.chatbot.flows.claim import ClaimFlow
from dulux_chatbot.chatbot.flows.complaint import ComplaintFlow
from dulux_chatbot.chatbot.flows.find_product import FindProductFlow
from dulux_chatbot.chatbot.flows.registration import RegistrationFlow
from dulux_chatbot.chatbot.flows.reissuance import ReissuanceFlow


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
    FlowType.FIND_PRODUCT: FindProductFlow,
    FlowType.COMPLAINT: ComplaintFlow,
    FlowType.REISSUANCE: ReissuanceFlow,
}

FLOW_INITIAL_STEPS = {
    FlowType.REGISTRATION: "consent",
    FlowType.CLAIM: "registration_lookup",
    FlowType.FIND_PRODUCT: "interior_exterior_select",
    FlowType.COMPLAINT: "subject",
    FlowType.REISSUANCE: "phone_lookup",
}


def dispatch(session, message: dict, client) -> None:
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
        "Reply with:\n1. Warranty Registration\n2. Warranty Claim\n3. Find a Product\n4. Raise a Complaint\n5. Certificate Reissuance",
    )
