from django.contrib.auth import get_user_model
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django_extensions.db.models import TimeStampedModel

from dulux_chatbot.audit_logs.choices import AuditAction


User = get_user_model()


class AuditLog(TimeStampedModel):
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    actor_email = models.EmailField(blank=True)
    action = models.CharField(max_length=10, choices=AuditAction.choices)
    content_type = models.ForeignKey(ContentType, on_delete=models.PROTECT, related_name="audit_logs")
    object_id = models.CharField(max_length=64)
    content_object = GenericForeignKey("content_type", "object_id")
    model_label = models.CharField(max_length=255)
    object_repr = models.CharField(max_length=255)
    changes = models.JSONField(null=True, blank=True)
    before_data = models.JSONField(null=True, blank=True)
    after_data = models.JSONField(null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.action} {self.model_label}#{self.object_id}"
