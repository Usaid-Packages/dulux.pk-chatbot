from django.utils import timezone

from dulux_chatbot.chatbot.choices import FlowType
from dulux_chatbot.chatbot.models import WhatsAppSession
from dulux_chatbot.core.validators import normalize_pakistan_phone_number


def activate_complaint_chat_session(*, phone_number: str, complaint_id: int) -> WhatsAppSession:
    normalized_phone_number = normalize_pakistan_phone_number(phone_number)
    session, _created = WhatsAppSession.objects.update_or_create(
        phone_number=normalized_phone_number or phone_number,
        defaults={
            "flow": FlowType.COMPLAINT,
            "current_step": "chat",
            "session_data": {"complaint_id": complaint_id},
            "last_activity": timezone.now(),
        },
    )
    return session
