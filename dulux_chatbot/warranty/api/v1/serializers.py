from datetime import date

from constance import config
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from dulux_chatbot.core.api.v1.serializers import ImageSerializer
from dulux_chatbot.core.models import Image
from dulux_chatbot.core.validators import validate_pakistan_phone_number
from dulux_chatbot.products.choices import ProductType
from dulux_chatbot.products.models import Product
from dulux_chatbot.warranty.choices import ClaimState, InvoiceType, PhotoType, RegistrationState
from dulux_chatbot.warranty.models import (
    ClaimImage,
    PaintPairInvoice,
    RegistrationPaintPair,
    RejectionField,
    WarrantyClaim,
    WarrantyRegistration,
)
from dulux_chatbot.warranty.tasks import generate_and_send_certificate, send_whatsapp_status_notification
from dulux_chatbot.warranty.utils import generate_registration_code


class PaintPairInvoiceSerializer(serializers.ModelSerializer):
    image = ImageSerializer(read_only=True)

    class Meta:
        model = PaintPairInvoice
        fields = ("id", "invoice_type", "image", "created")


class RegistrationPaintPairSerializer(serializers.ModelSerializer):
    topcoat_name = serializers.SerializerMethodField()
    basecoat_name = serializers.SerializerMethodField()

    class Meta:
        model = RegistrationPaintPair
        fields = (
            "id",
            "topcoat",
            "topcoat_name",
            "topcoat_quantity",
            "basecoat",
            "basecoat_name",
            "basecoat_quantity",
            "created",
        )

    def get_topcoat_name(self, obj: RegistrationPaintPair) -> str:
        return obj.topcoat.name

    def get_basecoat_name(self, obj: RegistrationPaintPair) -> str | None:
        return obj.basecoat.name if obj.basecoat else None


class WarrantyRegistrationListSerializer(serializers.ModelSerializer):
    class Meta:
        model = WarrantyRegistration
        fields = (
            "id",
            "registration_code",
            "customer_name",
            "phone_number",
            "channel",
            "state",
            "purchase_date",
            "created",
        )


class WarrantyRegistrationDetailSerializer(serializers.ModelSerializer):
    paint_pairs = RegistrationPaintPairSerializer(many=True, read_only=True)
    paint_pair_invoices = PaintPairInvoiceSerializer(source="invoices", many=True, read_only=True)
    approved_by_email = serializers.SerializerMethodField()

    class Meta:
        model = WarrantyRegistration
        fields = (
            "id",
            "registration_code",
            "channel",
            "state",
            "customer_name",
            "phone_number",
            "email",
            "city",
            "province",
            "site_address",
            "purchase_date",
            "purchase_dealer",
            "purchase_dealer_city",
            "purchase_dealer_address",
            "postal_code",
            "notes",
            "approved_by",
            "approved_by_email",
            "approved_at",
            "warranty_certificate",
            "paint_pairs",
            "paint_pair_invoices",
            "created",
            "modified",
        )

    def get_approved_by_email(self, obj: WarrantyRegistration) -> str | None:
        return obj.approved_by.email if obj.approved_by else None


class PaintPairInvoiceWriteSerializer(serializers.Serializer):
    image_id = serializers.PrimaryKeyRelatedField(queryset=Image.objects.all(), source="image")
    invoice_type = serializers.ChoiceField(choices=InvoiceType.choices)


class RejectionFieldWriteSerializer(serializers.Serializer):
    field_name = serializers.CharField(max_length=100, allow_blank=True)
    note = serializers.CharField(max_length=500, required=False, allow_blank=True)


class RegistrationPaintPairWriteSerializer(serializers.Serializer):
    topcoat = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    topcoat_quantity = serializers.DecimalField(max_digits=8, decimal_places=2)
    basecoat = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), required=False, allow_null=True)
    basecoat_quantity = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, allow_null=True)

    def validate(self, attrs: dict) -> dict:
        attrs = super().validate(attrs)

        topcoat = attrs["topcoat"]
        basecoat = attrs.get("basecoat")
        basecoat_quantity = attrs.get("basecoat_quantity")

        if topcoat.product_type != ProductType.TOPCOAT or not topcoat.is_active:
            raise serializers.ValidationError({"topcoat": "Topcoat must be an active TOPCOAT product."})

        if basecoat is not None and (basecoat.product_type != ProductType.BASECOAT or not basecoat.is_active):
            raise serializers.ValidationError({"basecoat": "Basecoat must be an active BASECOAT product."})

        if basecoat is None and basecoat_quantity is not None:
            raise serializers.ValidationError({"basecoat_quantity": "Basecoat quantity requires a basecoat."})

        if basecoat is not None and basecoat_quantity is None:
            raise serializers.ValidationError({"basecoat_quantity": "Basecoat quantity is required."})

        return attrs


class WarrantyRegistrationCreateSerializer(serializers.ModelSerializer):
    paint_pairs = RegistrationPaintPairWriteSerializer(many=True)
    paint_pair_invoices = PaintPairInvoiceWriteSerializer(many=True, required=False)

    class Meta:
        model = WarrantyRegistration
        fields = (
            "channel",
            "customer_name",
            "phone_number",
            "email",
            "city",
            "province",
            "site_address",
            "purchase_date",
            "purchase_dealer",
            "purchase_dealer_city",
            "purchase_dealer_address",
            "postal_code",
            "notes",
            "paint_pairs",
            "paint_pair_invoices",
        )

    def validate_purchase_date(self, value):
        if value > date.today():
            raise serializers.ValidationError("Purchase date cannot be in the future.")
        if (date.today() - value).days > config.REGISTRATION_PURCHASE_DAYS_LIMIT:
            raise serializers.ValidationError("Purchase date is outside the allowed registration window.")
        return value

    def validate_phone_number(self, value: str) -> str:
        return validate_pakistan_phone_number(value)

    def validate_paint_pairs(self, value):
        if not value:
            raise serializers.ValidationError("At least one paint pair is required.")
        return value

    @transaction.atomic
    def create(self, validated_data: dict) -> WarrantyRegistration:
        paint_pairs = validated_data.pop("paint_pairs")
        paint_pair_invoices = validated_data.pop("paint_pair_invoices", [])
        registration = WarrantyRegistration.objects.create(
            registration_code=generate_registration_code(),
            **validated_data,
        )

        for paint_pair_data in paint_pairs:
            RegistrationPaintPair.objects.create(registration=registration, **paint_pair_data)

        self._sync_paint_pair_invoices(registration=registration, paint_pair_invoices=paint_pair_invoices)

        return registration

    def _sync_paint_pair_invoices(self, *, registration: WarrantyRegistration, paint_pair_invoices: list[dict]) -> None:
        registration.invoices.all().delete()
        for invoice_data in paint_pair_invoices:
            PaintPairInvoice.objects.create(registration=registration, **invoice_data)


class WarrantyRegistrationUpdateSerializer(serializers.ModelSerializer):
    registration_number = serializers.CharField(source="registration_code", read_only=True)
    action = serializers.ChoiceField(
        choices=("APPROVE", "REJECT", "RESUBMIT", "IN_PROGRESS"),
        write_only=True,
        required=False,
    )
    rejection_fields = RejectionFieldWriteSerializer(many=True, required=False)
    paint_pairs = RegistrationPaintPairWriteSerializer(many=True, required=False)
    paint_pair_invoices = PaintPairInvoiceWriteSerializer(many=True, required=False)

    class Meta:
        model = WarrantyRegistration
        fields = (
            "id",
            "registration_number",
            "channel",
            "customer_name",
            "phone_number",
            "email",
            "city",
            "province",
            "site_address",
            "purchase_date",
            "purchase_dealer",
            "purchase_dealer_city",
            "purchase_dealer_address",
            "postal_code",
            "state",
            "notes",
            "approved_by",
            "approved_at",
            "action",
            "rejection_fields",
            "paint_pairs",
            "paint_pair_invoices",
        )
        read_only_fields = ("id", "registration_number", "state", "approved_by", "approved_at")

    def validate_purchase_date(self, value):
        if value > date.today():
            raise serializers.ValidationError("Purchase date cannot be in the future.")
        if (date.today() - value).days > config.REGISTRATION_PURCHASE_DAYS_LIMIT:
            raise serializers.ValidationError("Purchase date is outside the allowed registration window.")
        return value

    def validate_phone_number(self, value: str) -> str:
        return validate_pakistan_phone_number(value)

    def validate(self, attrs: dict) -> dict:
        attrs = super().validate(attrs)
        action = attrs.get("action")
        if action is not None:
            current_state = self.instance.state

            allowed_transitions = {
                "IN_PROGRESS": {RegistrationState.SUBMITTED},
                "APPROVE": {RegistrationState.SUBMITTED, RegistrationState.IN_PROGRESS, RegistrationState.RESUBMIT},
                "REJECT": {RegistrationState.SUBMITTED, RegistrationState.IN_PROGRESS, RegistrationState.RESUBMIT},
                "RESUBMIT": {RegistrationState.SUBMITTED, RegistrationState.IN_PROGRESS},
            }

            if current_state not in allowed_transitions[action]:
                raise serializers.ValidationError(
                    {"action": f"Cannot transition registration from {current_state} using {action}."}
                )

            if action in {"REJECT", "RESUBMIT"} and not attrs.get("notes"):
                raise serializers.ValidationError({"notes": "Notes are required for reject or resubmit."})

        return attrs

    @transaction.atomic
    def update(self, instance: WarrantyRegistration, validated_data: dict) -> WarrantyRegistration:
        action = validated_data.pop("action", None)
        rejection_fields = validated_data.pop("rejection_fields", [])
        paint_pairs = validated_data.pop("paint_pairs", None)
        paint_pair_invoices = validated_data.pop("paint_pair_invoices", None)
        notes = validated_data.get("notes", "").strip()
        if "notes" in validated_data:
            validated_data["notes"] = notes

        for field, value in validated_data.items():
            setattr(instance, field, value)

        if action is not None:
            state_map = {
                "IN_PROGRESS": RegistrationState.IN_PROGRESS,
                "APPROVE": RegistrationState.APPROVED,
                "REJECT": RegistrationState.REJECTED,
                "RESUBMIT": RegistrationState.RESUBMIT,
            }
            instance.state = state_map[action]

            if action == "APPROVE":
                instance.approved_by = self.context["request"].user
                instance.approved_at = timezone.now()

        instance.save()

        if paint_pairs is not None:
            self._sync_paint_pairs(instance=instance, paint_pairs=paint_pairs)

        if paint_pair_invoices is not None:
            self._sync_paint_pair_invoices(instance=instance, paint_pair_invoices=paint_pair_invoices)

        if action is not None:
            self._sync_rejection_fields(instance=instance, rejection_fields=rejection_fields)

            if action == "APPROVE":
                generate_and_send_certificate.delay(instance.id)
            elif action in {"REJECT", "RESUBMIT"} and notes:
                send_whatsapp_status_notification.delay(instance.phone_number, notes)

        return instance

    def _sync_paint_pairs(
        self,
        *,
        instance: WarrantyRegistration,
        paint_pairs: list[dict],
    ) -> None:
        instance.paint_pairs.all().delete()
        for paint_pair_data in paint_pairs:
            RegistrationPaintPair.objects.create(registration=instance, **paint_pair_data)

    def _sync_paint_pair_invoices(self, *, instance: WarrantyRegistration, paint_pair_invoices: list[dict]) -> None:
        instance.invoices.all().delete()
        for invoice_data in paint_pair_invoices:
            PaintPairInvoice.objects.create(
                registration=instance,
                **invoice_data,
            )

    def _sync_rejection_fields(self, *, instance: WarrantyRegistration, rejection_fields: list[dict]) -> None:
        if instance.state != RegistrationState.RESUBMIT:
            instance.rejection_fields.all().delete()
            return

        field_names = {item.get("field_name", "") for item in rejection_fields}
        RejectionField.objects.filter(registration=instance).exclude(field_name__in=field_names).delete()

        for rejection_field in rejection_fields:
            field_name = rejection_field.get("field_name", "")
            note = rejection_field.get("note", "")
            RejectionField.objects.update_or_create(
                registration=instance,
                field_name=field_name,
                defaults={"note": note},
            )


class ClaimImageSerializer(serializers.ModelSerializer):
    image = ImageSerializer(read_only=True)

    class Meta:
        model = ClaimImage
        fields = ("id", "photo_type", "image", "created")


class WarrantyClaimListSerializer(serializers.ModelSerializer):
    registration_number = serializers.CharField(source="registration.registration_code", read_only=True)
    topcoat_name = serializers.SerializerMethodField()

    class Meta:
        model = WarrantyClaim
        fields = (
            "id",
            "registration_number",
            "topcoat_name",
            "issue_type",
            "affected_area_sqft",
            "claim_date",
            "state",
        )

    def get_topcoat_name(self, obj: WarrantyClaim) -> str:
        return obj.paint_pair.topcoat.name


class WarrantyClaimDetailSerializer(serializers.ModelSerializer):
    registration = WarrantyRegistrationListSerializer(read_only=True)
    paint_pair = RegistrationPaintPairSerializer(read_only=True)
    images = ClaimImageSerializer(many=True, read_only=True)

    class Meta:
        model = WarrantyClaim
        fields = (
            "id",
            "registration",
            "paint_pair",
            "issue_type",
            "affected_area_sqft",
            "claim_date",
            "state",
            "notes",
            "approved_by",
            "approved_at",
            "images",
            "created",
            "modified",
        )


class ClaimImageWriteSerializer(serializers.Serializer):
    image_id = serializers.PrimaryKeyRelatedField(queryset=Image.objects.all(), source="image")
    photo_type = serializers.ChoiceField(choices=PhotoType.choices)


class WarrantyClaimCreateSerializer(serializers.ModelSerializer):
    BLOCKING_CLAIM_STATES = (
        ClaimState.SUBMITTED,
        ClaimState.IN_REVIEW,
        ClaimState.QA_REVIEW,
        ClaimState.APPROVED,
    )
    images = ClaimImageWriteSerializer(many=True)

    class Meta:
        model = WarrantyClaim
        fields = ("registration", "paint_pair", "issue_type", "affected_area_sqft", "notes", "images")

    def validate_registration(self, value):
        if value.state != RegistrationState.APPROVED:
            raise serializers.ValidationError("Claims can only be created for approved registrations.")
        return value

    def validate_images(self, value):
        if len(value) < config.MIN_CLAIM_PHOTOS:
            raise serializers.ValidationError("Minimum claim photos requirement not met.")

        photo_types = [image["photo_type"] for image in value]
        if len(photo_types) != len(set(photo_types)):
            raise serializers.ValidationError("Photo types must be unique.")

        return value

    def validate(self, attrs: dict) -> dict:
        attrs = super().validate(attrs)
        registration = attrs["registration"]
        paint_pair = attrs["paint_pair"]
        if paint_pair.registration_id != registration.id:
            raise serializers.ValidationError({"paint_pair": "Paint pair must belong to the selected registration."})
        if WarrantyClaim.objects.filter(
            registration=registration,
            paint_pair=paint_pair,
            state__in=self.BLOCKING_CLAIM_STATES,
        ).exists():
            raise serializers.ValidationError({"paint_pair": "A claim already exists for the selected paint pair."})
        return attrs

    @transaction.atomic
    def create(self, validated_data: dict) -> WarrantyClaim:
        images = validated_data.pop("images")
        claim = WarrantyClaim.objects.create(**validated_data)
        for image_data in images:
            ClaimImage.objects.create(claim=claim, **image_data)
        return claim


class WarrantyClaimUpdateSerializer(serializers.ModelSerializer):
    registration_number = serializers.CharField(source="registration.registration_code", read_only=True)
    action = serializers.ChoiceField(
        choices=("APPROVE", "REJECT", "RESUBMIT", "IN_REVIEW", "QA_REVIEW"),
        write_only=True,
        required=False,
    )

    class Meta:
        model = WarrantyClaim
        fields = (
            "id",
            "registration_number",
            "issue_type",
            "affected_area_sqft",
            "state",
            "notes",
            "approved_by",
            "approved_at",
            "action",
        )
        read_only_fields = ("id", "registration_number", "state", "approved_by", "approved_at")

    def validate(self, attrs: dict) -> dict:
        attrs = super().validate(attrs)
        action = attrs.get("action")
        if action is not None:
            current_state = self.instance.state

            allowed_transitions = {
                "IN_REVIEW": {ClaimState.SUBMITTED},
                "QA_REVIEW": {ClaimState.IN_REVIEW},
                "APPROVE": {ClaimState.IN_REVIEW, ClaimState.QA_REVIEW, ClaimState.RESUBMIT},
                "REJECT": {ClaimState.IN_REVIEW, ClaimState.QA_REVIEW, ClaimState.RESUBMIT},
                "RESUBMIT": {ClaimState.IN_REVIEW, ClaimState.QA_REVIEW},
            }

            if current_state not in allowed_transitions[action]:
                raise serializers.ValidationError(
                    {"action": f"Cannot transition claim from {current_state} using {action}."}
                )

            if action in {"REJECT", "RESUBMIT"} and not attrs.get("notes"):
                raise serializers.ValidationError({"notes": "Notes are required for reject or resubmit."})

        return attrs

    @transaction.atomic
    def update(self, instance: WarrantyClaim, validated_data: dict) -> WarrantyClaim:
        action = validated_data.pop("action", None)
        notes = validated_data.get("notes", "").strip()
        if "notes" in validated_data:
            validated_data["notes"] = notes

        for field, value in validated_data.items():
            setattr(instance, field, value)

        if action is not None:
            state_map = {
                "IN_REVIEW": ClaimState.IN_REVIEW,
                "QA_REVIEW": ClaimState.QA_REVIEW,
                "APPROVE": ClaimState.APPROVED,
                "REJECT": ClaimState.REJECTED,
                "RESUBMIT": ClaimState.RESUBMIT,
            }
            instance.state = state_map[action]

            if action == "APPROVE":
                instance.approved_by = self.context["request"].user
                instance.approved_at = timezone.now()

        instance.save()

        if action == "APPROVE":
            send_whatsapp_status_notification.delay(instance.registration.phone_number, "Claim approved.")
        elif action in {"REJECT", "RESUBMIT"} and notes:
            send_whatsapp_status_notification.delay(instance.registration.phone_number, notes)

        return instance
