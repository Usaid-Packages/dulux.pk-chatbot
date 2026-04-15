from django.db import models
from django_extensions.db.models import TimeStampedModel

from dulux_chatbot.chatbot.choices import FlowType


class WhatsAppSession(TimeStampedModel):
    phone_number = models.CharField(max_length=20, unique=True)
    # TODO(audit P1-11 Suggestion): `null=True` on a CharField creates two empty
    # states (NULL and ""), which splits query logic (flow__isnull=True vs flow="").
    # Django convention: strings use `blank=True, default=""`. Needs a data
    # migration to backfill NULLs before flipping the schema.
    flow = models.CharField(max_length=20, choices=FlowType.choices, null=True, blank=True)
    current_step = models.CharField(max_length=50, default="menu")
    session_data = models.JSONField(default=dict)
    last_activity = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.phone_number


# TODO(audit P1-5 Important): Grows unbounded. Every inbound webhook creates a row
# and nothing prunes them. Dedup only needs a short window (Meta retries minutes,
# not months). Over a year in production this table balloons to millions of rows,
# slowing the hot-path `get_or_create` index lookup on every message. Add a
# Celery Beat task to purge rows older than 7 days.
class ProcessedMessage(models.Model):
    message_id = models.CharField(max_length=100, unique=True)
    processed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.message_id
