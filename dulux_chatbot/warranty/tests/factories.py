from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model

from dulux_chatbot.core.models import Image
from dulux_chatbot.products.choices import ProductType
from dulux_chatbot.products.tests.factories import create_product
from dulux_chatbot.users.choices import UserRole
from dulux_chatbot.warranty.choices import (
    ClaimState,
    InvoiceType,
    IssueType,
    PhotoType,
    RegistrationChannel,
    RegistrationState,
)
from dulux_chatbot.warranty.models import (
    ClaimImage,
    PaintPairInvoice,
    RegistrationPaintPair,
    WarrantyClaim,
    WarrantyRegistration,
)
from dulux_chatbot.warranty.utils.helpers import generate_registration_code


User = get_user_model()


def create_user(*, email: str, role: str):
    return User.objects.create_user(email=email, password="test-password-123", role=role)


def create_cs_user(*, email: str = "cs@example.com"):
    return create_user(email=email, role=UserRole.CS_AGENT)


def create_admin_user(*, email: str = "admin@example.com"):
    return create_user(email=email, role=UserRole.ADMIN)


def create_quality_user(*, email: str = "qa@example.com"):
    return create_user(email=email, role=UserRole.QUALITY_REVIEWER)


def create_image(*, image_name: str = "warranty/test.jpg") -> Image:
    return Image.objects.create(image=image_name)


def create_registration(
    *,
    phone_number: str = "923001234567",
    state: str = RegistrationState.SUBMITTED,
    channel: str = RegistrationChannel.WHATSAPP,
) -> WarrantyRegistration:
    return WarrantyRegistration.objects.create(
        registration_code=generate_registration_code(),
        channel=channel,
        state=state,
        customer_name="Customer Name",
        phone_number=phone_number,
        email="customer@example.com",
        city="Karachi",
        site_address="123 Street",
        purchase_date=date.today() - timedelta(days=5),
        purchase_dealer="Dealer",
        purchase_dealer_city="Karachi",
        purchase_dealer_address="Dealer Address",
        postal_code="75000",
        notes="",
    )


def create_paint_pair(
    *,
    registration: WarrantyRegistration,
    topcoat=None,
    basecoat=None,
) -> RegistrationPaintPair:
    topcoat = topcoat or create_product(name="Warranty Topcoat", product_type=ProductType.TOPCOAT, warranty_years=5)
    basecoat = basecoat or create_product(name="Warranty Basecoat", product_type=ProductType.BASECOAT, warranty_years=3)
    return RegistrationPaintPair.objects.create(
        registration=registration,
        topcoat=topcoat,
        topcoat_quantity=Decimal("10.00"),
        basecoat=basecoat,
        basecoat_quantity=Decimal("5.00"),
    )


def create_paint_pair_invoice(
    *,
    registration: WarrantyRegistration,
    invoice_type: str = InvoiceType.TOPCOAT,
) -> PaintPairInvoice:
    return PaintPairInvoice.objects.create(
        registration=registration,
        image=create_image(),
        invoice_type=invoice_type,
    )


def create_claim(
    *,
    registration: WarrantyRegistration,
    paint_pair: RegistrationPaintPair,
    state: str = ClaimState.SUBMITTED,
) -> WarrantyClaim:
    return WarrantyClaim.objects.create(
        registration=registration,
        paint_pair=paint_pair,
        issue_type=IssueType.PEELING_CRACKING,
        affected_area_sqft=Decimal("150.00"),
        state=state,
        notes="",
    )


def create_claim_image(
    *,
    claim: WarrantyClaim,
    photo_type: str = PhotoType.LONG_SHOT,
) -> ClaimImage:
    return ClaimImage.objects.create(
        claim=claim,
        image=create_image(),
        photo_type=photo_type,
    )
