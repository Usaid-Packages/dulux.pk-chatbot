from datetime import date

from constance import config
from django.db import transaction
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from rest_framework import serializers

from dulux_chatbot.audit_logs.services import build_instance_snapshot, log_create, log_update
from dulux_chatbot.core.api.v1.serializers import ImageSerializer
from dulux_chatbot.core.models import Image
from dulux_chatbot.core.validators import validate_pakistan_phone_number
from dulux_chatbot.products.choices import ProductType
from dulux_chatbot.products.models import Product
from dulux_chatbot.warranty.choices import (
    ClaimResubmissionSource,
    ClaimState,
    InvoiceType,
    PhotoType,
    QualityDecisionType,
    QualityRequiredItem,
    QualityTechnicalReason,
    RegistrationState,
)
from dulux_chatbot.warranty.models import (
    ClaimImage,
    ClaimQualityReview,
    ClaimQualityReviewItem,
    ClaimResubmission,
    ClaimResubmissionEntry,
    PaintPairInvoice,
    RegistrationPaintPair,
    RejectionField,
    WarrantyClaim,
    WarrantyRegistration,
)
from dulux_chatbot.warranty.tasks import (
    send_claim_resubmit_notification,
    send_claim_status_notification,
    send_registration_resubmit_notification,
    send_registration_status_notification,
    send_whatsapp_status_notification,
)
from dulux_chatbot.warranty.utils import generate_registration_code


QUALITY_IMAGE_REQUIRED_ITEMS = {
    QualityRequiredItem.ADDITIONAL_PHOTOS_DIFFERENT_ANGLES,
    QualityRequiredItem.CLOSE_UP_DAMAGE_PHOTOS,
    QualityRequiredItem.PRODUCT_BATCH_NUMBER_PHOTO,
    QualityRequiredItem.PROOF_OF_PURCHASE_INVOICE,
}

QUALITY_TEXT_REQUIRED_ITEMS = {
    QualityRequiredItem.APPLICATION_DETAILS_METHOD_COATS_PREP,
    QualityRequiredItem.ISSUE_TIMELINE_DETAILS,
    QualityRequiredItem.SITE_CONDITIONS_INFO,
    QualityRequiredItem.OTHER,
}


def _build_registration_snapshot(registration: WarrantyRegistration) -> dict:
    return build_instance_snapshot(
        registration,
        extra_data={
            "paint_pairs": [
                {
                    "id": pair.id,
                    "topcoat_id": pair.topcoat_id,
                    "topcoat_quantity": str(pair.topcoat_quantity),
                    "basecoat_id": pair.basecoat_id,
                    "basecoat_quantity": str(pair.basecoat_quantity) if pair.basecoat_quantity is not None else None,
                }
                for pair in registration.paint_pairs.order_by("id")
            ],
            "invoice_ids": list(registration.invoices.order_by("id").values_list("image_id", flat=True)),
            "rejection_fields": [
                {"field_name": item.field_name, "note": item.note}
                for item in registration.rejection_fields.order_by("id")
            ],
        },
    )


def _build_claim_snapshot(claim: WarrantyClaim) -> dict:
    return build_instance_snapshot(
        claim,
        extra_data={
            "images": [
                {
                    "id": image.id,
                    "image_id": image.image_id,
                    "photo_type": image.photo_type,
                }
                for image in claim.images.order_by("id")
            ],
            "quality_review_ids": list(claim.quality_reviews.order_by("id").values_list("id", flat=True)),
            "resubmissions": [
                {
                    "id": resubmission.id,
                    "source": resubmission.source,
                    "notes": resubmission.notes,
                    "entries": [
                        {
                            "id": entry.id,
                            "required_item": entry.required_item,
                            "response_text": entry.response_text,
                            "image_id": entry.image_id,
                        }
                        for entry in resubmission.entries.order_by("id")
                    ],
                }
                for resubmission in claim.resubmissions.order_by("id").prefetch_related("entries")
            ],
        },
    )


def _build_quality_review_snapshot(review: ClaimQualityReview) -> dict:
    return build_instance_snapshot(
        review,
        extra_data={
            "required_items": [
                {
                    "id": item.id,
                    "required_item": item.required_item,
                }
                for item in review.required_items.order_by("id")
            ]
        },
    )


class PaintPairInvoiceSerializer(serializers.ModelSerializer):
    image = ImageSerializer(read_only=True)

    class Meta:
        model = PaintPairInvoice
        fields = ("id", "invoice_type", "image", "created")


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


class RejectionFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = RejectionField
        fields = ("id", "field_name", "note", "created")


class WarrantyRegistrationDetailSerializer(serializers.ModelSerializer):
    paint_pairs = RegistrationPaintPairSerializer(many=True, read_only=True)
    paint_pair_invoices = PaintPairInvoiceSerializer(source="invoices", many=True, read_only=True)
    rejection_fields = RejectionFieldSerializer(many=True, read_only=True)
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
            "rejection_fields",
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

        if topcoat.warranty_years <= 0:
            raise serializers.ValidationError({"topcoat": "Topcoat warranty years must be greater than 0."})

        if basecoat is not None and (basecoat.product_type != ProductType.BASECOAT or not basecoat.is_active):
            raise serializers.ValidationError({"basecoat": "Basecoat must be an active BASECOAT product."})

        if basecoat is not None and basecoat.warranty_years <= 0:
            raise serializers.ValidationError({"basecoat": "Basecoat warranty years must be greater than 0."})

        if basecoat is not None and not topcoat.basecoats.filter(pk=basecoat.pk).exists():
            raise serializers.ValidationError({"basecoat": "Basecoat must be linked to the selected topcoat product."})

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
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        registration = WarrantyRegistration.objects.create(
            registration_code=generate_registration_code(),
            **validated_data,
        )

        for paint_pair_data in paint_pairs:
            RegistrationPaintPair.objects.create(registration=registration, **paint_pair_data)

        self._sync_paint_pair_invoices(registration=registration, paint_pair_invoices=paint_pair_invoices)
        log_create(
            actor=actor,
            instance=registration,
            request=request,
            after_data=_build_registration_snapshot(registration),
            event_label="Registration created",
        )

        return registration

    def _sync_paint_pair_invoices(
        self, *, registration: WarrantyRegistration, paint_pair_invoices: list[dict]
    ) -> list[PaintPairInvoice]:
        registration.invoices.all().delete()
        created_invoices: list[PaintPairInvoice] = []
        for invoice_data in paint_pair_invoices:
            created_invoices.append(PaintPairInvoice.objects.create(registration=registration, **invoice_data))
        return created_invoices


class WarrantyRegistrationUpdateSerializer(serializers.ModelSerializer):
    REGISTRATION_FIELD_UPDATE_FIELDS = {
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
        "paint_pairs",
        "paint_pair_invoices",
    }
    CONTROL_UPDATE_FIELDS = {"action", "notes", "notification_template", "rejection_fields"}

    registration_number = serializers.CharField(source="registration_code", read_only=True)
    action = serializers.ChoiceField(
        choices=("APPROVE", "REJECT", "RESUBMIT", "IN_PROGRESS"),
        write_only=True,
        required=False,
    )
    notification_template = serializers.CharField(write_only=True, required=False, allow_blank=True)
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
            "notification_template",
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
        notification_template = attrs.get("notification_template")
        self._validate_rejected_field_update()
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

            if action in {"APPROVE", "REJECT"}:
                if not isinstance(notification_template, str) or not notification_template.strip():
                    raise serializers.ValidationError(
                        {
                            "notification_template": "notification_template HTML string is required for approve or reject."
                        }
                    )

        return attrs

    def _validate_rejected_field_update(self) -> None:
        incoming_fields = set(self.initial_data)
        registration_update_fields = incoming_fields & self.REGISTRATION_FIELD_UPDATE_FIELDS
        if not registration_update_fields:
            return

        mixed_control_fields = incoming_fields & self.CONTROL_UPDATE_FIELDS
        if mixed_control_fields:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Registration fields must be updated separately from status, notes, or rejection field updates."
                    )
                }
            )

        if self.instance.state != RegistrationState.RESUBMIT:
            raise serializers.ValidationError(
                {"detail": "Registration fields can only be updated when the registration is in RESUBMIT state."}
            )

        allowed_fields = set(self.instance.rejection_fields.values_list("field_name", flat=True))
        disallowed_fields = registration_update_fields - allowed_fields
        if disallowed_fields:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Only fields requested for resubmission can be updated. Invalid fields: "
                        f"{', '.join(sorted(disallowed_fields))}."
                    )
                }
            )

    @transaction.atomic
    def update(self, instance: WarrantyRegistration, validated_data: dict) -> WarrantyRegistration:
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        before_data = _build_registration_snapshot(instance)
        action = validated_data.pop("action", None)
        notification_template = validated_data.pop("notification_template", None)
        rejection_fields = validated_data.pop("rejection_fields", [])
        paint_pairs = validated_data.pop("paint_pairs", None)
        paint_pair_invoices = validated_data.pop("paint_pair_invoices", None)
        notes = validated_data.get("notes", "").strip()
        if "notes" in validated_data:
            validated_data["notes"] = notes

        has_resubmission_field_update = bool(
            set(getattr(self, "initial_data", {})) & self.REGISTRATION_FIELD_UPDATE_FIELDS
        )

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
        elif has_resubmission_field_update:
            instance.state = RegistrationState.SUBMITTED

        instance.save()

        if paint_pairs is not None:
            self._sync_paint_pairs(instance=instance, paint_pairs=paint_pairs)

        if paint_pair_invoices is not None:
            self._sync_paint_pair_invoices(instance=instance, paint_pair_invoices=paint_pair_invoices)

        if action is not None:
            self._sync_rejection_fields(instance=instance, rejection_fields=rejection_fields)

            if action == "APPROVE":
                send_registration_status_notification.delay(instance.id, notification_template=notification_template)
            elif action == "RESUBMIT":
                send_registration_resubmit_notification.delay(instance.id)
            elif action == "REJECT":
                send_registration_status_notification.delay(instance.id, notification_template=notification_template)

        log_update(
            actor=actor,
            instance=instance,
            request=request,
            before_data=before_data,
            after_data=_build_registration_snapshot(instance),
            event_label=self._build_registration_event_label(action=action),
        )

        return instance

    def _sync_paint_pairs(
        self,
        *,
        instance: WarrantyRegistration,
        paint_pairs: list[dict],
    ) -> None:
        try:
            instance.paint_pairs.all().delete()
        except ProtectedError as exc:
            raise serializers.ValidationError(
                {
                    "paint_pairs": (
                        "Paint pairs cannot be replaced because one or more existing paint pairs are already linked "
                        "to claims."
                    )
                }
            ) from exc
        for paint_pair_data in paint_pairs:
            RegistrationPaintPair.objects.create(registration=instance, **paint_pair_data)

    def _sync_paint_pair_invoices(self, *, instance: WarrantyRegistration, paint_pair_invoices: list[dict]) -> None:
        instance.invoices.all().delete()
        for invoice_data in paint_pair_invoices:
            PaintPairInvoice.objects.create(registration=instance, **invoice_data)

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

    @staticmethod
    def _build_registration_event_label(*, action: str | None) -> str:
        action_labels = {
            "APPROVE": "Registration approved",
            "REJECT": "Registration rejected",
            "RESUBMIT": "Registration marked for resubmission",
            "IN_PROGRESS": "Registration moved to in progress",
        }
        return action_labels.get(action or "", "Registration updated")


class ClaimImageSerializer(serializers.ModelSerializer):
    image = ImageSerializer(read_only=True)

    class Meta:
        model = ClaimImage
        fields = ("id", "photo_type", "image", "created")


class ClaimQualityReviewItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClaimQualityReviewItem
        fields = ("id", "required_item", "created")


class ClaimQualityReviewSerializer(serializers.ModelSerializer):
    created_by_email = serializers.SerializerMethodField()
    required_items = ClaimQualityReviewItemSerializer(many=True, read_only=True)

    class Meta:
        model = ClaimQualityReview
        fields = (
            "id",
            "decision_type",
            "technical_reason",
            "notes",
            "other_text",
            "created_by",
            "created_by_email",
            "required_items",
            "created",
        )

    def get_created_by_email(self, obj: ClaimQualityReview) -> str | None:
        return obj.created_by.email if obj.created_by else None


class ClaimResubmissionEntrySerializer(serializers.ModelSerializer):
    image = ImageSerializer(read_only=True)

    class Meta:
        model = ClaimResubmissionEntry
        fields = ("id", "required_item", "response_text", "image", "created")


class ClaimResubmissionSerializer(serializers.ModelSerializer):
    entries = ClaimResubmissionEntrySerializer(many=True, read_only=True)

    class Meta:
        model = ClaimResubmission
        fields = ("id", "source", "notes", "entries", "created")


class WarrantyClaimListSerializer(serializers.ModelSerializer):
    registration_number = serializers.CharField(source="registration.registration_code", read_only=True)
    customer_name = serializers.CharField(source="registration.customer_name", read_only=True)
    topcoat_name = serializers.SerializerMethodField()
    latest_quality_decision = serializers.SerializerMethodField()

    class Meta:
        model = WarrantyClaim
        fields = (
            "id",
            "registration_number",
            "customer_name",
            "topcoat_name",
            "issue_type",
            "affected_area_sqft",
            "claim_date",
            "state",
            "latest_quality_decision",
        )

    def get_topcoat_name(self, obj: WarrantyClaim) -> str:
        return obj.paint_pair.topcoat.name

    def get_latest_quality_decision(self, obj: WarrantyClaim) -> str | None:
        latest_review = obj.quality_reviews.order_by("-created", "-id").first()
        return latest_review.decision_type if latest_review else None


class WarrantyClaimDetailSerializer(serializers.ModelSerializer):
    registration = WarrantyRegistrationListSerializer(read_only=True)
    paint_pair = RegistrationPaintPairSerializer(read_only=True)
    images = ClaimImageSerializer(many=True, read_only=True)
    latest_quality_review = serializers.SerializerMethodField()
    latest_resubmission = serializers.SerializerMethodField()

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
            "voucher",
            "approved_by",
            "approved_at",
            "images",
            "latest_quality_review",
            "latest_resubmission",
            "created",
            "modified",
        )

    def get_latest_quality_review(self, obj: WarrantyClaim) -> dict | None:
        latest_review = obj.quality_reviews.order_by("-created", "-id").first()
        if latest_review is None:
            return None
        return ClaimQualityReviewSerializer(latest_review).data

    def get_latest_resubmission(self, obj: WarrantyClaim) -> dict | None:
        latest_resubmission = obj.resubmissions.order_by("-created", "-id").first()
        if latest_resubmission is None:
            return None
        return ClaimResubmissionSerializer(latest_resubmission).data


class ClaimImageWriteSerializer(serializers.Serializer):
    image_id = serializers.PrimaryKeyRelatedField(queryset=Image.objects.all(), source="image")
    photo_type = serializers.ChoiceField(choices=PhotoType.choices)


class WarrantyClaimCreateSerializer(serializers.ModelSerializer):
    BLOCKING_CLAIM_STATES = (
        ClaimState.SUBMITTED,
        ClaimState.IN_REVIEW,
        ClaimState.QA_REVIEW,
        ClaimState.QA_APPROVED,
        ClaimState.QA_REJECTED,
        ClaimState.RESUBMIT,
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
        if paint_pair.topcoat.warranty_years <= 0:
            raise serializers.ValidationError({"paint_pair": "Claim product warranty years must be greater than 0."})
        if paint_pair.basecoat is not None and paint_pair.basecoat.warranty_years <= 0:
            raise serializers.ValidationError({"paint_pair": "Claim product warranty years must be greater than 0."})
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
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        claim = WarrantyClaim.objects.create(**validated_data)
        for image_data in images:
            ClaimImage.objects.create(claim=claim, **image_data)
        log_create(
            actor=actor,
            instance=claim,
            request=request,
            after_data=_build_claim_snapshot(claim),
            event_label="Claim created",
        )
        return claim


class WarrantyClaimUpdateSerializer(serializers.ModelSerializer):
    registration_number = serializers.CharField(source="registration.registration_code", read_only=True)
    action = serializers.ChoiceField(
        choices=("APPROVE", "REJECT", "IN_REVIEW", "QA_REVIEW"),
        write_only=True,
        required=False,
    )
    notification_template = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = WarrantyClaim
        fields = (
            "id",
            "registration_number",
            "issue_type",
            "affected_area_sqft",
            "state",
            "notes",
            "voucher",
            "approved_by",
            "approved_at",
            "action",
            "notification_template",
        )
        read_only_fields = ("id", "registration_number", "state", "approved_by", "approved_at")

    def validate(self, attrs: dict) -> dict:
        attrs = super().validate(attrs)
        action = attrs.get("action")
        notification_template = attrs.get("notification_template")
        if action is not None:
            current_state = self.instance.state

            allowed_transitions = {
                "IN_REVIEW": {ClaimState.SUBMITTED},
                "QA_REVIEW": {ClaimState.IN_REVIEW},
                "APPROVE": {ClaimState.QA_APPROVED},
                "REJECT": {ClaimState.QA_REJECTED},
            }

            if current_state not in allowed_transitions[action]:
                raise serializers.ValidationError(
                    {"action": f"Cannot transition claim from {current_state} using {action}."}
                )

            if action in {"APPROVE", "REJECT"}:
                if not isinstance(notification_template, str) or not notification_template.strip():
                    raise serializers.ValidationError(
                        {
                            "notification_template": "notification_template HTML string is required for approve or reject."
                        }
                    )
            if action == "APPROVE" and not attrs.get("voucher"):
                raise serializers.ValidationError({"voucher": "voucher file is required for approve."})

        return attrs

    @transaction.atomic
    def update(self, instance: WarrantyClaim, validated_data: dict) -> WarrantyClaim:
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        before_data = _build_claim_snapshot(instance)
        action = validated_data.pop("action", None)
        notification_template = validated_data.pop("notification_template", None)
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
            }
            instance.state = state_map[action]

            if action == "APPROVE":
                instance.approved_by = self.context["request"].user
                instance.approved_at = timezone.now()

        instance.save()

        if action in {"APPROVE", "REJECT"}:
            send_claim_status_notification.delay(instance.id, notification_template=notification_template)

        log_update(
            actor=actor,
            instance=instance,
            request=request,
            before_data=before_data,
            after_data=_build_claim_snapshot(instance),
            event_label=self._build_claim_event_label(action=action),
        )

        return instance

    @staticmethod
    def _build_claim_event_label(*, action: str | None) -> str:
        action_labels = {
            "IN_REVIEW": "Claim moved to CS review",
            "QA_REVIEW": "Claim forwarded to quality",
            "APPROVE": "Claim approved",
            "REJECT": "Claim rejected",
        }
        return action_labels.get(action or "", "Claim updated")


class ClaimQualityApproveSerializer(serializers.Serializer):
    technical_notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate(self, attrs: dict) -> dict:
        attrs = super().validate(attrs)
        claim = self.context["claim"]
        if claim.state != ClaimState.QA_REVIEW:
            raise serializers.ValidationError({"detail": "Only claims in QA_REVIEW can be qa-approved."})
        return attrs

    @transaction.atomic
    def save(self, **kwargs) -> WarrantyClaim:
        claim: WarrantyClaim = self.context["claim"]
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        before_data = _build_claim_snapshot(claim)
        notes = self.validated_data.get("technical_notes", "").strip()
        quality_review = ClaimQualityReview.objects.create(
            claim=claim,
            decision_type=QualityDecisionType.QA_APPROVED,
            notes=notes,
            created_by=request.user,
        )
        claim.state = ClaimState.QA_APPROVED
        claim.notes = notes
        claim.save(update_fields=["state", "notes", "modified"])
        log_create(
            actor=actor,
            instance=quality_review,
            request=request,
            after_data=_build_quality_review_snapshot(quality_review),
            event_label="QA approved claim",
        )
        log_update(
            actor=actor,
            instance=claim,
            request=request,
            before_data=before_data,
            after_data=_build_claim_snapshot(claim),
            event_label="Claim moved to QA approved",
        )
        return claim


class ClaimQualityRejectSerializer(serializers.Serializer):
    technical_reason = serializers.ChoiceField(choices=QualityTechnicalReason.choices)
    technical_notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate(self, attrs: dict) -> dict:
        attrs = super().validate(attrs)
        claim = self.context["claim"]
        if claim.state != ClaimState.QA_REVIEW:
            raise serializers.ValidationError({"detail": "Only claims in QA_REVIEW can be qa-rejected."})
        return attrs

    @transaction.atomic
    def save(self, **kwargs) -> WarrantyClaim:
        claim: WarrantyClaim = self.context["claim"]
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        before_data = _build_claim_snapshot(claim)
        notes = self.validated_data.get("technical_notes", "").strip()
        quality_review = ClaimQualityReview.objects.create(
            claim=claim,
            decision_type=QualityDecisionType.QA_REJECTED,
            technical_reason=self.validated_data["technical_reason"],
            notes=notes,
            created_by=request.user,
        )
        claim.state = ClaimState.QA_REJECTED
        claim.notes = notes
        claim.save(update_fields=["state", "notes", "modified"])
        log_create(
            actor=actor,
            instance=quality_review,
            request=request,
            after_data=_build_quality_review_snapshot(quality_review),
            event_label="QA rejected claim",
        )
        log_update(
            actor=actor,
            instance=claim,
            request=request,
            before_data=before_data,
            after_data=_build_claim_snapshot(claim),
            event_label="Claim moved to QA rejected",
        )
        return claim


class ClaimQualityRequestInfoSerializer(serializers.Serializer):
    required_items = serializers.ListField(
        child=serializers.ChoiceField(choices=QualityRequiredItem.choices),
        allow_empty=False,
    )
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    other_text = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate(self, attrs: dict) -> dict:
        attrs = super().validate(attrs)
        claim = self.context["claim"]
        if claim.state != ClaimState.QA_REVIEW:
            raise serializers.ValidationError({"detail": "Only claims in QA_REVIEW can request more info."})
        if QualityRequiredItem.OTHER in attrs["required_items"] and not attrs.get("other_text", "").strip():
            raise serializers.ValidationError({"other_text": "other_text is required when OTHER is selected."})
        return attrs

    @transaction.atomic
    def save(self, **kwargs) -> WarrantyClaim:
        claim: WarrantyClaim = self.context["claim"]
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        before_data = _build_claim_snapshot(claim)
        notes = self.validated_data.get("notes", "").strip()
        other_text = self.validated_data.get("other_text", "").strip()
        required_items = self.validated_data["required_items"]
        quality_review = ClaimQualityReview.objects.create(
            claim=claim,
            decision_type=QualityDecisionType.REQUEST_INFO,
            notes=notes,
            other_text=other_text,
            created_by=request.user,
        )
        for required_item in required_items:
            ClaimQualityReviewItem.objects.create(quality_review=quality_review, required_item=required_item)
        log_create(
            actor=actor,
            instance=quality_review,
            request=request,
            after_data=_build_quality_review_snapshot(quality_review),
            event_label="QA requested more information",
        )
        claim.state = ClaimState.RESUBMIT
        if notes:
            claim.notes = notes
            claim.save(update_fields=["state", "notes", "modified"])
        else:
            claim.save(update_fields=["state", "modified"])
        log_update(
            actor=actor,
            instance=claim,
            request=request,
            before_data=before_data,
            after_data=_build_claim_snapshot(claim),
            event_label="Claim moved to resubmission",
        )
        send_claim_resubmit_notification.delay(claim.id)
        return claim


class ClaimResubmissionEntryWriteSerializer(serializers.Serializer):
    required_item = serializers.ChoiceField(choices=QualityRequiredItem.choices)
    response_text = serializers.CharField(required=False, allow_blank=True)
    image_id = serializers.PrimaryKeyRelatedField(queryset=Image.objects.all(), source="image", required=False)

    def validate(self, attrs: dict) -> dict:
        attrs = super().validate(attrs)
        has_text = bool(attrs.get("response_text", "").strip())
        has_image = attrs.get("image") is not None
        if not has_text and not has_image:
            raise serializers.ValidationError("Either response_text or image_id is required.")
        return attrs


class ClaimRequestedItemSerializer(serializers.Serializer):
    required_item = serializers.ChoiceField(choices=QualityRequiredItem.choices)
    label = serializers.CharField(read_only=True)
    input_type = serializers.ChoiceField(choices=("IMAGE", "TEXT"), read_only=True)
    is_multiple = serializers.BooleanField(read_only=True)


class ClaimResubmissionRequestSerializer(serializers.Serializer):
    claim_id = serializers.IntegerField(read_only=True)
    claim_state = serializers.ChoiceField(choices=ClaimState.choices, read_only=True)
    quality_review_id = serializers.IntegerField(read_only=True)
    quality_notes = serializers.CharField(read_only=True, allow_blank=True)
    other_text = serializers.CharField(read_only=True, allow_blank=True)
    requested_items = ClaimRequestedItemSerializer(many=True, read_only=True)
    created = serializers.DateTimeField(read_only=True)

    @staticmethod
    def build_from_claim(claim: WarrantyClaim) -> dict:
        if claim.state != ClaimState.RESUBMIT:
            raise serializers.ValidationError({"detail": "Only claims in RESUBMIT can fetch resubmission fields."})

        latest_quality_review = (
            claim.quality_reviews.filter(decision_type=QualityDecisionType.REQUEST_INFO)
            .prefetch_related("required_items")
            .order_by("-created", "-id")
            .first()
        )
        if latest_quality_review is None:
            raise serializers.ValidationError({"detail": "No QA request-info record exists for this claim."})

        requested_items = []
        for required_item in latest_quality_review.required_items.order_by("id"):
            item_value = required_item.required_item
            requested_items.append(
                {
                    "required_item": item_value,
                    "label": QualityRequiredItem(item_value).label,
                    "input_type": "IMAGE" if item_value in QUALITY_IMAGE_REQUIRED_ITEMS else "TEXT",
                    "is_multiple": item_value in QUALITY_IMAGE_REQUIRED_ITEMS,
                }
            )

        return {
            "claim_id": claim.id,
            "claim_state": claim.state,
            "quality_review_id": latest_quality_review.id,
            "quality_notes": latest_quality_review.notes,
            "other_text": latest_quality_review.other_text,
            "requested_items": requested_items,
            "created": latest_quality_review.created,
        }


class ClaimResubmissionCreateSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    entries = ClaimResubmissionEntryWriteSerializer(many=True, required=False)

    def validate(self, attrs: dict) -> dict:
        attrs = super().validate(attrs)
        claim = self.context["claim"]
        if claim.state != ClaimState.RESUBMIT:
            raise serializers.ValidationError({"detail": "Only claims in RESUBMIT can accept resubmission details."})
        if not attrs.get("entries") and not attrs.get("notes", "").strip():
            raise serializers.ValidationError({"detail": "At least one resubmission detail is required."})
        return attrs

    @transaction.atomic
    def save(self, **kwargs) -> WarrantyClaim:
        claim: WarrantyClaim = self.context["claim"]
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        before_data = _build_claim_snapshot(claim)
        notes = self.validated_data.get("notes", "").strip()
        resubmission = ClaimResubmission.objects.create(
            claim=claim,
            source=ClaimResubmissionSource.WHATSAPP,
            notes=notes,
        )
        for entry in self.validated_data.get("entries", []):
            ClaimResubmissionEntry.objects.create(resubmission=resubmission, **entry)
        claim.state = ClaimState.QA_REVIEW
        if notes:
            claim.notes = notes
            claim.save(update_fields=["state", "notes", "modified"])
        else:
            claim.save(update_fields=["state", "modified"])
        log_update(
            actor=actor,
            instance=claim,
            request=request,
            before_data=before_data,
            after_data=_build_claim_snapshot(claim),
            event_label="Claim resubmitted",
        )
        return claim


class ClaimCSRResubmissionCreateSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    entries = ClaimResubmissionEntryWriteSerializer(many=True, required=False)

    def validate(self, attrs: dict) -> dict:
        attrs = super().validate(attrs)
        claim = self.context["claim"]
        if claim.state != ClaimState.RESUBMIT:
            raise serializers.ValidationError({"detail": "Only claims in RESUBMIT can accept resubmission details."})

        latest_quality_review = (
            claim.quality_reviews.filter(decision_type=QualityDecisionType.REQUEST_INFO)
            .prefetch_related("required_items")
            .order_by("-created", "-id")
            .first()
        )
        if latest_quality_review is None:
            raise serializers.ValidationError({"detail": "No QA request-info record exists for this claim."})

        entries = attrs.get("entries", [])
        if not entries and not attrs.get("notes", "").strip():
            raise serializers.ValidationError({"detail": "At least one resubmission detail is required."})

        requested_item_values = {
            item.required_item for item in latest_quality_review.required_items.all() if item.required_item
        }
        submitted_item_values = {entry["required_item"] for entry in entries}

        unexpected_items = submitted_item_values - requested_item_values
        if unexpected_items:
            raise serializers.ValidationError(
                {"entries": [f"Unexpected required_item values: {', '.join(sorted(unexpected_items))}."]}
            )

        missing_items = requested_item_values - submitted_item_values
        if missing_items:
            raise serializers.ValidationError(
                {"entries": [f"Missing required_item values: {', '.join(sorted(missing_items))}."]}
            )

        attrs["latest_quality_review"] = latest_quality_review
        return attrs

    @transaction.atomic
    def save(self, **kwargs) -> WarrantyClaim:
        claim: WarrantyClaim = self.context["claim"]
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        before_data = _build_claim_snapshot(claim)
        notes = self.validated_data.get("notes", "").strip()
        resubmission = ClaimResubmission.objects.create(
            claim=claim,
            source=ClaimResubmissionSource.COMPLAINT,
            notes=notes,
        )
        for entry in self.validated_data.get("entries", []):
            ClaimResubmissionEntry.objects.create(resubmission=resubmission, **entry)
        claim.state = ClaimState.QA_REVIEW
        if notes:
            claim.notes = notes
            claim.save(update_fields=["state", "notes", "modified"])
        else:
            claim.save(update_fields=["state", "modified"])
        log_update(
            actor=actor,
            instance=claim,
            request=request,
            before_data=before_data,
            after_data=_build_claim_snapshot(claim),
            event_label="Claim resubmitted by CSR",
        )
        return claim
