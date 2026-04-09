from django.contrib import admin

from dulux_chatbot.audit_logs.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created", "actor_email", "action", "model_label", "object_id", "object_repr")
    list_filter = ("action", "model_label", "created")
    search_fields = ("actor_email", "object_id", "object_repr", "model_label")
    ordering = ("-created", "-id")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
