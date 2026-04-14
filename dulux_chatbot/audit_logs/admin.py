from django.contrib import admin

from dulux_chatbot.audit_logs.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "created", "actor_email", "action", "model_label", "object_id", "event_label")
    list_filter = ("action", "model_label", "created", "content_type")
    search_fields = ("actor_email", "object_id", "object_repr", "model_label", "event_label")
    raw_id_fields = ("actor", "content_type")
    ordering = ("-created", "-id")
