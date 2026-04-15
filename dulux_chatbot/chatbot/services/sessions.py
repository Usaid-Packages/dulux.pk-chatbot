from django.utils import timezone

from dulux_chatbot.chatbot.choices import FlowType
from dulux_chatbot.chatbot.models import WhatsAppSession


def activate_complaint_chat_session(*, phone_number: str, complaint_id: int) -> WhatsAppSession:
    target_phone_number = str(phone_number or "").strip()
    session_defaults = {
        "flow": FlowType.COMPLAINT,
        "current_step": "chat",
        "session_data": {"complaint_id": complaint_id},
        "last_activity": timezone.now(),
    }
    session, _created = WhatsAppSession.objects.update_or_create(
        phone_number=target_phone_number,
        defaults=session_defaults,
    )
    return session


def reset_whatsapp_session_to_main_menu(*, phone_number: str) -> None:
    target_phone_number = str(phone_number or "").strip()
    if not target_phone_number:
        return
    WhatsAppSession.objects.update_or_create(
        phone_number=target_phone_number,
        defaults={
            "flow": None,
            "current_step": "menu",
            "session_data": {},
            "last_activity": timezone.now(),
        },
    )


# TODO(audit C3): Read-modify-write without locking. If CS ends the chat while the
# customer sends a new message, one writer silently overwrites the other. Wrap in
# `transaction.atomic()` and use `.select_for_update().filter(...).first()` to
# serialize with the dispatcher's session lock.
def end_complaint_chat_session(*, phone_number: str, complaint_id: int) -> None:
    target_phone_number = str(phone_number or "").strip()
    session = WhatsAppSession.objects.filter(
        phone_number=target_phone_number,
        flow=FlowType.COMPLAINT,
        session_data__complaint_id=complaint_id,
    ).first()
    if session is None:
        return
    session.flow = None
    session.current_step = "menu"
    session.session_data = {}
    session.last_activity = timezone.now()
    session.save(update_fields=["flow", "current_step", "session_data", "last_activity", "modified"])
