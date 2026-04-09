from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from dulux_chatbot.complaints.choices import ComplaintStatus, MessageSender
from dulux_chatbot.complaints.models import ChatMessage, Complaint, ComplaintImage
from dulux_chatbot.core.api.v1.serializers import ImageSerializer
from dulux_chatbot.core.models import Image
from dulux_chatbot.core.validators import validate_pakistan_phone_number
from dulux_chatbot.warranty.models import WarrantyRegistration


class ComplaintImageSerializer(serializers.ModelSerializer):
    image = ImageSerializer(read_only=True)

    class Meta:
        model = ComplaintImage
        fields = ("id", "image", "created")


class CardCountQuerySerializer(serializers.Serializer):
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    agent_id = serializers.IntegerField(required=False, min_value=1)

    def validate(self, attrs: dict) -> dict:
        attrs = super().validate(attrs)
        date_from = attrs.get("date_from")
        date_to = attrs.get("date_to")
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError("date_from must be less than or equal to date_to.")
        return attrs


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ("id", "sender", "text", "created")


class ComplaintListSerializer(serializers.ModelSerializer):
    registration_number = serializers.CharField(source="registration.registration_code", read_only=True)
    assigned_to_email = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = (
            "id",
            "registration_number",
            "phone_number",
            "customer_name",
            "subject",
            "status",
            "assigned_to",
            "assigned_to_email",
            "created",
        )

    def get_assigned_to_email(self, obj: Complaint) -> str | None:
        return obj.assigned_to.email if obj.assigned_to else None


class ComplaintDetailSerializer(serializers.ModelSerializer):
    registration_number = serializers.CharField(source="registration.registration_code", read_only=True)
    images = ComplaintImageSerializer(many=True, read_only=True)
    messages = ChatMessageSerializer(many=True, read_only=True)
    assigned_to_email = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = (
            "id",
            "registration",
            "registration_number",
            "phone_number",
            "customer_name",
            "subject",
            "description",
            "status",
            "assigned_to",
            "assigned_to_email",
            "closed_at",
            "closure_note",
            "images",
            "messages",
            "created",
            "modified",
        )

    def get_assigned_to_email(self, obj: Complaint) -> str | None:
        return obj.assigned_to.email if obj.assigned_to else None


class ComplaintImageWriteSerializer(serializers.Serializer):
    image_id = serializers.PrimaryKeyRelatedField(queryset=Image.objects.all(), source="image")


class ComplaintCreateSerializer(serializers.ModelSerializer):
    images = ComplaintImageWriteSerializer(many=True, required=False)

    class Meta:
        model = Complaint
        fields = (
            "registration",
            "phone_number",
            "customer_name",
            "subject",
            "description",
            "images",
        )

    def validate_phone_number(self, value: str) -> str:
        return validate_pakistan_phone_number(value)

    def validate_registration(self, value: WarrantyRegistration | None):
        if value is None:
            return value
        if value.phone_number != self.initial_data.get("phone_number"):
            raise serializers.ValidationError("Registration phone number must match complaint phone number.")
        return value

    @transaction.atomic
    def create(self, validated_data: dict) -> Complaint:
        images = validated_data.pop("images", [])
        complaint = Complaint.objects.create(**validated_data)
        for image_data in images:
            ComplaintImage.objects.create(complaint=complaint, **image_data)
        return complaint


class ComplaintUpdateSerializer(serializers.ModelSerializer):
    action = serializers.ChoiceField(
        choices=("ASSIGN", "RESOLVE", "CLOSE", "REOPEN"),
        write_only=True,
        required=False,
    )
    images = ComplaintImageWriteSerializer(many=True, required=False)

    class Meta:
        model = Complaint
        fields = (
            "id",
            "registration",
            "phone_number",
            "customer_name",
            "subject",
            "description",
            "status",
            "assigned_to",
            "closed_at",
            "closure_note",
            "action",
            "images",
        )
        read_only_fields = ("id", "status", "closed_at")

    def validate_phone_number(self, value: str) -> str:
        return validate_pakistan_phone_number(value)

    def validate(self, attrs: dict) -> dict:
        attrs = super().validate(attrs)
        action = attrs.get("action")
        if action is None:
            return attrs

        allowed_transitions = {
            "ASSIGN": {ComplaintStatus.OPEN},
            "RESOLVE": {ComplaintStatus.IN_PROGRESS},
            "CLOSE": {ComplaintStatus.RESOLVED},
            "REOPEN": {ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED},
        }
        current_status = self.instance.status
        if current_status not in allowed_transitions.get(action, set()):
            raise serializers.ValidationError(
                {"action": f"Cannot transition complaint from {current_status} using {action}."}
            )

        if action == "ASSIGN" and attrs.get("assigned_to") is None and self.instance.assigned_to is None:
            raise serializers.ValidationError({"assigned_to": "Assigned user is required for assign action."})

        if action == "CLOSE" and not attrs.get("closure_note") and not self.instance.closure_note:
            raise serializers.ValidationError({"closure_note": "Closure note is required for close action."})

        return attrs

    @transaction.atomic
    def update(self, instance: Complaint, validated_data: dict) -> Complaint:
        action = validated_data.pop("action", None)
        images = validated_data.pop("images", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        if action is not None:
            state_map = {
                "ASSIGN": ComplaintStatus.IN_PROGRESS,
                "RESOLVE": ComplaintStatus.RESOLVED,
                "CLOSE": ComplaintStatus.CLOSED,
                "REOPEN": ComplaintStatus.IN_PROGRESS,
            }
            instance.status = state_map[action]
            if action == "CLOSE":
                instance.closed_at = timezone.now()
            elif action in {"ASSIGN", "REOPEN"}:
                instance.closed_at = None
                instance.closure_note = ""

        instance.save()

        if images is not None:
            instance.images.all().delete()
            for image_data in images:
                ComplaintImage.objects.create(complaint=instance, **image_data)

        return instance


class ChatMessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ("text",)

    def validate_text(self, value: str) -> str:
        text = value.strip()
        if not text:
            raise serializers.ValidationError("This field may not be blank.")
        return text

    def create(self, validated_data: dict) -> ChatMessage:
        complaint = self.context["complaint"]
        return ChatMessage.objects.create(
            complaint=complaint,
            sender=MessageSender.CS_AGENT,
            **validated_data,
        )
