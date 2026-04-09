from rest_framework import serializers

from dulux_chatbot.audit_logs.models import AuditLog


class AuditLogListSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actor",
            "actor_email",
            "action",
            "model_label",
            "object_id",
            "object_repr",
            "created",
        )


class AuditLogDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actor",
            "actor_email",
            "action",
            "model_label",
            "object_id",
            "object_repr",
            "changes",
            "before_data",
            "after_data",
            "created",
        )
