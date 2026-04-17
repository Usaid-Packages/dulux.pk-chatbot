from django.db import models
from django_extensions.db.models import TimeStampedModel

from dulux_chatbot.chatbot.choices import FlowType
from dulux_chatbot.chatbot.constants import STEP_MENU


class WhatsAppSession(TimeStampedModel):
    phone_number = models.CharField(max_length=20, unique=True)
    # TODO(audit P1-11 Suggestion): null=True on CharField creates two empty states
    # (NULL and ""). Django convention: strings use blank=True, default="".
    # Needs data migration to backfill existing NULLs before schema change.
    flow = models.CharField(max_length=20, choices=FlowType.choices, null=True, blank=True)
    current_step = models.CharField(max_length=50, default=STEP_MENU)
    session_data = models.JSONField(default=dict)
    last_activity = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.phone_number


# TODO(audit P1-5 Important): Grows unbounded — every inbound webhook creates a
# row and nothing prunes. Add a Celery Beat task to purge rows older than 7 days.
class ProcessedMessage(models.Model):
    message_id = models.CharField(max_length=100, unique=True)
    processed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.message_id
