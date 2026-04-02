from django.contrib import admin

from dulux_chatbot.warranty.models import (
    ClaimImage,
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
    readonly_fields = ("registration_code", "state", "created", "modified", "approved_by", "approved_at")
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
    readonly_fields = ("state", "claim_date", "created", "modified", "approved_by", "approved_at")
    raw_id_fields = ("registration", "paint_pair")


@admin.register(ClaimImage)
class ClaimImageAdmin(admin.ModelAdmin):
    list_display = ("id", "claim", "photo_type", "created")
    raw_id_fields = ("claim", "image")


@admin.register(RejectionField)
class RejectionFieldAdmin(admin.ModelAdmin):
    list_display = ("id", "registration", "field_name", "created")
    raw_id_fields = ("registration",)
