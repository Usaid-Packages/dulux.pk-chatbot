from rest_framework import serializers

from dulux_chatbot.audit_logs.models import AuditLog


class AuditLogListSerializer(serializers.ModelSerializer):
    registration_number = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actor",
            "actor_email",
            "action",
            "object_id",
            "object_repr",
            "event_label",
            "registration_number",
            "created",
        )

    def get_registration_number(self, obj: AuditLog) -> str | None:
        return _extract_registration_number(obj)


class AuditLogDetailSerializer(serializers.ModelSerializer):
    registration_number = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actor",
            "actor_email",
            "action",
            "object_id",
            "object_repr",
            "event_label",
            "registration_number",
            "changes",
            "before_data",
            "after_data",
            "created",
        )

    def get_registration_number(self, obj: AuditLog) -> str | None:
        return _extract_registration_number(obj)


def _extract_registration_number(obj: AuditLog) -> str | None:
    source_data = obj.after_data or obj.before_data or {}
    if obj.model_label == "warranty.WarrantyRegistration":
        registration_code = source_data.get("registration_code")
        return registration_code if isinstance(registration_code, str) and registration_code else None
    if obj.model_label == "warranty.WarrantyClaim":
        registration_data = source_data.get("registration")
        if isinstance(registration_data, dict):
            registration_code = registration_data.get("registration_code")
            return registration_code if isinstance(registration_code, str) and registration_code else None
    if obj.model_label == "warranty.ClaimQualityReview":
        claim_data = source_data.get("claim")
        if isinstance(claim_data, dict):
            registration_code = claim_data.get("registration_code")
            return registration_code if isinstance(registration_code, str) and registration_code else None
    return None
