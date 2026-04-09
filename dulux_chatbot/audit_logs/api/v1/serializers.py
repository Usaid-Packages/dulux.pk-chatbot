from rest_framework import serializers

from dulux_chatbot.audit_logs.models import AuditLog


class AuditLogTimelineQuerySerializer(serializers.Serializer):
    TIMELINE_TYPE_CHOICES = (
        ("registration", "Registration"),
        ("claim", "Claim"),
        ("quality", "Quality"),
        ("complaint", "Complaint"),
    )

    type = serializers.ChoiceField(choices=TIMELINE_TYPE_CHOICES)
    object_id = serializers.IntegerField(min_value=1)


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


class AuditLogTimelineItemSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    event_type = serializers.CharField(source="event_label")
    updated_fields = serializers.SerializerMethodField()
    performed_at = serializers.DateTimeField(source="created")
    registration_number = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "user",
            "actor_email",
            "action",
            "event_type",
            "performed_at",
            "updated_fields",
            "changes",
            "registration_number",
        )

    def get_user(self, obj: AuditLog) -> str:
        actor = obj.actor
        if actor is not None:
            full_name = str(getattr(actor, "get_full_name", lambda: "")() or "").strip()
            if full_name:
                return full_name
        return obj.actor_email or "Unknown User"

    def get_updated_fields(self, obj: AuditLog) -> list[str]:
        changes = obj.changes or {}
        if not isinstance(changes, dict):
            return []
        return list(changes.keys())

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
