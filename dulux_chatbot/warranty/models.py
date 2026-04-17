from django.conf import settings
from django.db import models
from django_extensions.db.models import TimeStampedModel

from dulux_chatbot.products.models import Product
from dulux_chatbot.warranty.choices import (
    ClaimResubmissionSource,
    ClaimState,
    InvoiceType,
    IssueType,
    PhotoType,
    QualityDecisionType,
    QualityRequiredItem,
    QualityTechnicalReason,
    RegistrationChannel,
    RegistrationState,
)


class WarrantyRegistration(TimeStampedModel):
    registration_code = models.CharField(max_length=10, unique=True, editable=False)
    channel = models.CharField(max_length=10, choices=RegistrationChannel.choices, default=RegistrationChannel.WHATSAPP)
    state = models.CharField(
        max_length=20,
        choices=RegistrationState.choices,
        default=RegistrationState.SUBMITTED,
        db_index=True,
    )
    customer_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, db_index=True)
    email = models.EmailField()
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100, blank=True)
    site_address = models.TextField()
    purchase_date = models.DateField()
    purchase_dealer = models.CharField(max_length=255, blank=True)
    purchase_dealer_city = models.CharField(max_length=100, blank=True)
    purchase_dealer_address = models.TextField(blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_registrations",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    warranty_certificate = models.FileField(upload_to="certificates/%Y/%m/", null=True, blank=True)

    def __str__(self) -> str:
        return self.registration_code

    @property
    def approved_by_email(self) -> str | None:
        return self.approved_by.email if self.approved_by else None


class RegistrationPaintPair(TimeStampedModel):
    registration = models.ForeignKey(WarrantyRegistration, on_delete=models.CASCADE, related_name="paint_pairs")
    topcoat = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="topcoat_pairs")
    topcoat_quantity = models.DecimalField(max_digits=8, decimal_places=2)
    basecoat = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="basecoat_pairs",
    )
    basecoat_quantity = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.registration.registration_code} - {self.topcoat.name}"

    @property
    def topcoat_name(self) -> str:
        return self.topcoat.name

    @property
    def basecoat_name(self) -> str | None:
        return self.basecoat.name if self.basecoat else None


class PaintPairInvoice(TimeStampedModel):
    registration = models.ForeignKey(WarrantyRegistration, on_delete=models.CASCADE, related_name="invoices")
    image = models.ForeignKey("core.Image", on_delete=models.PROTECT, related_name="paint_pair_invoices")
    invoice_type = models.CharField(max_length=10, choices=InvoiceType.choices)

    def __str__(self) -> str:
        return f"{self.registration.registration_code} - {self.invoice_type}"


class WarrantyClaim(TimeStampedModel):
    registration = models.ForeignKey(WarrantyRegistration, on_delete=models.PROTECT, related_name="claims")
    paint_pair = models.ForeignKey(RegistrationPaintPair, on_delete=models.PROTECT, related_name="claims_pair")
    issue_type = models.CharField(max_length=25, choices=IssueType.choices)
    affected_area_sqft = models.DecimalField(max_digits=10, decimal_places=2)
    claim_date = models.DateField(auto_now_add=True)
    state = models.CharField(max_length=20, choices=ClaimState.choices, default=ClaimState.SUBMITTED, db_index=True)
    notes = models.TextField(blank=True)
    voucher = models.FileField(upload_to="claim-vouchers/%Y/%m/", null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_claims",
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"Claim {self.id}"

    @property
    def topcoat_name(self) -> str:
        return self.paint_pair.topcoat.name


class ClaimQualityReview(TimeStampedModel):
    claim = models.ForeignKey(WarrantyClaim, on_delete=models.CASCADE, related_name="quality_reviews")
    decision_type = models.CharField(max_length=20, choices=QualityDecisionType.choices)
    technical_reason = models.CharField(
        max_length=30,
        choices=QualityTechnicalReason.choices,
        null=True,
        blank=True,
    )
    notes = models.TextField()
    other_text = models.CharField(max_length=500, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="claim_quality_reviews",
    )

    def __str__(self) -> str:
        return f"{self.claim_id} - {self.decision_type}"


class ClaimQualityReviewItem(TimeStampedModel):
    quality_review = models.ForeignKey(
        ClaimQualityReview,
        on_delete=models.CASCADE,
        related_name="required_items",
    )
    required_item = models.CharField(max_length=50, choices=QualityRequiredItem.choices)

    def __str__(self) -> str:
        return f"{self.quality_review_id} - {self.required_item}"


class ClaimResubmission(TimeStampedModel):
    claim = models.ForeignKey(WarrantyClaim, on_delete=models.CASCADE, related_name="resubmissions")
    source = models.CharField(max_length=20, choices=ClaimResubmissionSource.choices)
    notes = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"{self.claim_id} - {self.source}"


class ClaimResubmissionEntry(TimeStampedModel):
    resubmission = models.ForeignKey(
        ClaimResubmission,
        on_delete=models.CASCADE,
        related_name="entries",
    )
    required_item = models.CharField(max_length=50, choices=QualityRequiredItem.choices)
    response_text = models.TextField(blank=True)
    image = models.ForeignKey(
        "core.Image",
        on_delete=models.PROTECT,
        related_name="claim_resubmission_entries",
        null=True,
        blank=True,
    )

    def __str__(self) -> str:
        return f"{self.resubmission_id} - {self.required_item}"


class ClaimImage(TimeStampedModel):
    claim = models.ForeignKey(WarrantyClaim, on_delete=models.CASCADE, related_name="images")
    image = models.ForeignKey("core.Image", on_delete=models.PROTECT, related_name="claim_images")
    photo_type = models.CharField(max_length=20, choices=PhotoType.choices)

    class Meta:
        unique_together = [("claim", "photo_type")]

    def __str__(self) -> str:
        return f"{self.claim_id} - {self.photo_type}"


class RejectionField(TimeStampedModel):
    registration = models.ForeignKey(WarrantyRegistration, on_delete=models.CASCADE, related_name="rejection_fields")
    field_name = models.CharField(max_length=100, blank=True)
    note = models.CharField(max_length=500, blank=True)

    class Meta:
        unique_together = [("registration", "field_name")]

    def __str__(self) -> str:
        return f"{self.registration.registration_code} - {self.field_name}"
