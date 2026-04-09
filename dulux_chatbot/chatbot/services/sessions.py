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
