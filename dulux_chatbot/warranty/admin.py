from django.contrib import admin

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


@admin.register(WarrantyRegistration)
class WarrantyRegistrationAdmin(admin.ModelAdmin):
    list_display = (
        "registration_code",
        "customer_name",
        "phone_number",
        "channel",
        "state",
        "purchase_date",
        "created",
    )
    list_filter = ("state", "channel")
    search_fields = ("registration_code", "phone_number", "customer_name", "email")
    raw_id_fields = ("approved_by",)
    date_hierarchy = "created"


@admin.register(RegistrationPaintPair)
class RegistrationPaintPairAdmin(admin.ModelAdmin):
    list_display = ("id", "registration", "topcoat", "topcoat_quantity", "basecoat", "basecoat_quantity", "created")
    raw_id_fields = ("registration", "topcoat", "basecoat")


@admin.register(PaintPairInvoice)
class PaintPairInvoiceAdmin(admin.ModelAdmin):
    list_display = ("id", "registration", "invoice_type", "created")
    list_filter = ("invoice_type",)
    raw_id_fields = ("registration", "image")


@admin.register(WarrantyClaim)
class WarrantyClaimAdmin(admin.ModelAdmin):
    list_display = ("id", "registration", "paint_pair", "issue_type", "state", "claim_date", "created")
    list_filter = ("state", "issue_type")
    search_fields = ("registration__registration_code", "registration__phone_number")
    raw_id_fields = ("registration", "paint_pair", "approved_by")


@admin.register(ClaimQualityReview)
class ClaimQualityReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "claim", "decision_type", "technical_reason", "created_by", "created")
    list_filter = ("decision_type", "technical_reason")
    search_fields = ("claim__registration__registration_code", "notes", "other_text")
    raw_id_fields = ("claim", "created_by")


@admin.register(ClaimQualityReviewItem)
class ClaimQualityReviewItemAdmin(admin.ModelAdmin):
    list_display = ("id", "quality_review", "required_item", "created")
    list_filter = ("required_item",)
    search_fields = ("quality_review__claim__registration__registration_code",)
    raw_id_fields = ("quality_review",)


@admin.register(ClaimResubmission)
class ClaimResubmissionAdmin(admin.ModelAdmin):
    list_display = ("id", "claim", "source", "created")
    list_filter = ("source",)
    search_fields = ("claim__registration__registration_code", "notes")
    raw_id_fields = ("claim",)


@admin.register(ClaimResubmissionEntry)
class ClaimResubmissionEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "resubmission", "required_item", "image", "created")
    list_filter = ("required_item",)
    search_fields = ("resubmission__claim__registration__registration_code", "response_text")
    raw_id_fields = ("resubmission", "image")


@admin.register(ClaimImage)
class ClaimImageAdmin(admin.ModelAdmin):
    list_display = ("id", "claim", "photo_type", "created")
    raw_id_fields = ("claim", "image")


@admin.register(RejectionField)
class RejectionFieldAdmin(admin.ModelAdmin):
    list_display = ("id", "registration", "field_name", "created")
    raw_id_fields = ("registration",)
