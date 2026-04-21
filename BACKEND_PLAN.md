# Dulux Chatbot — Backend Execution Plan

*Chunks added one at a time after approval.*

---

## ✅ Chunk 0 — Core Shared Utilities

### `dulux_chatbot/core/models.py` *(modify)*
```python
from django_extensions.db.models import TimeStampedModel
from django.db import models

class Image(TimeStampedModel):
    image = models.ImageField(upload_to="images/%Y/%m/")
```
All app models inherit `TimeStampedModel` directly → provides `created` + `modified` fields.

### `dulux_chatbot/users/choices.py` *(new)*
```python
from django.db import models

class UserRole(models.TextChoices):
    CS_AGENT         = "CS_AGENT", "CS Agent"
    QUALITY_REVIEWER = "QUALITY_REVIEWER", "Quality Reviewer"
    ADMIN = "ADMIN", "Admin"
```

### `dulux_chatbot/users/models.py` *(modify)*
```python
from dulux_chatbot.users.choices import UserRole

class User(AbstractUser):
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices
    )


```
Add migration for the new `role` field and expose it in Django admin / user serializers where needed.

### `dulux_chatbot/core/permissions.py` *(new)*
```python
from rest_framework.permissions import BasePermission
from dulux_chatbot.users.choices import UserRole

class IsCSAgent(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == UserRole.CS_AGENT


class IsQualityReviewer(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == UserRole.QUALITY_REVIEWER


class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == UserRole.ADMIN


class IsCSAgentOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in [UserRole.CS_AGENT, UserRole.ADMIN]


class IsQualityReviewerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in [UserRole.QUALITY_REVIEWER, UserRole.ADMIN]
```

### `dulux_chatbot/core/exceptions.py` *(new)*
```python
from rest_framework.views import exception_handler
import logging
logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        view = context.get("view")
        logger.error("API exception in %s: %s",
                     view.__class__.__name__ if view else "unknown", exc)
    return response
```

### `config/settings/constance.py` *(add to `CONSTANCE_CONFIG`)*
```python
"MAX_OTP_RETRIES": (3, "Maximum OTP verification attempts"),
"OTP_CODE_LENGTH": (6, "Length of OTP code"),
"WHATSAPP_API_TIMEOUT_SECS": (10, "WhatsApp API request timeout in seconds"),
"IMPORT_CHUNK_SIZE": (100, "Rows per DB transaction in bulk imports"),
"MAX_IMPORT_FILE_SIZE_MB": (10, "Maximum import file size in MB"),
"MIN_CLAIM_PHOTOS": (3, "Minimum photos required per warranty claim"),
"OTP_EXPIRY_MINUTES": (5, "Minutes before a WhatsApp OTP expires"),
"REGISTRATION_PURCHASE_DAYS_LIMIT": (60, "Max days prior to registration that purchase date is accepted"),
```
All accessed via `from constance import config` → `config.OTP_EXPIRY_MINUTES` etc.

### `config/settings/base.py` *(add)*
```python
# WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN        = config("WHATSAPP_ACCESS_TOKEN")
WHATSAPP_PHONE_NUMBER_ID     = config("WHATSAPP_PHONE_NUMBER_ID")
WHATSAPP_VERIFY_TOKEN        = config("WHATSAPP_VERIFY_TOKEN")
WHATSAPP_BUSINESS_ACCOUNT_ID = config("WHATSAPP_BUSINESS_ACCOUNT_ID")

# Django Channels
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [("redis", 6379)]},
    }
}
ASGI_APPLICATION = "config.asgi.application"
```
Add to `REST_FRAMEWORK`:
```python
"EXCEPTION_HANDLER": "dulux_chatbot.core.exceptions.custom_exception_handler"
```
Add `"daphne"` to top of `INSTALLED_APPS`.

### `config/requirements/base.in` *(add)*
```
requests==2.31.*
reportlab==4.2.*
Pillow==10.3.*
openpyxl==3.1.*
channels==4.0.*
channels-redis==4.1.*
daphne==4.0.*
```

### `config/env/.env.example` *(verify/add)*
```
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_BUSINESS_ACCOUNT_ID=
```

### `dulux_chatbot/core/api/v1/` *(new)*
Image upload endpoint used by frontend before linking images to products, invoices, or claims.

```python
# serializers.py
class ImageSerializer(ModelSerializer):
    url = SerializerMethodField()
    def get_url(self, obj): return obj.image.url
    class Meta:
        model  = Image
        fields = ("id", "url", "created")

# views.py
class ImageUploadView(CreateAPIView):
    serializer_class   = ImageSerializer
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser]

# urls.py
path("images/", ImageUploadView.as_view(), name="image-upload")
```

**Tests:** None — utilities tested via the apps that use them.

---

## ✅ Chunk 1 — Products App

### App scaffold
```
dulux_chatbot/products/
  __init__.py
  apps.py
  choices.py
  models.py
  admin.py
  migrations/__init__.py
  migrations/0002_seed_products.py
  api/__init__.py
  api/v1/__init__.py
  api/v1/serializers.py
  api/v1/views.py
  api/v1/urls.py
  tests/__init__.py
  tests/factories.py
  tests/test_api.py
```
- Register `"dulux_chatbot.products"` in `CUSTOM_APPS`
- Add `path("api/v1/products/", include("dulux_chatbot.products.api.v1.urls"))` to `config/urls.py`

### `products/choices.py`
```python
class ProductType(models.TextChoices):
    TOPCOAT  = "topcoat",  "TOPCOAT"
    BASECOAT = "basecoat", "BASECOAT"
```

### `products/models.py`
```python
class Product(TimeStampedModel):
    name             = models.CharField(max_length=255)
    product_type     = models.CharField(max_length=10, choices=ProductType.choices, db_index=True)
    warranty_years   = models.PositiveSmallIntegerField(null=True, blank=True)
    features         = models.TextField(blank=True)       # PRD: shown in Find a Product result
    coverage_details = models.TextField(blank=True)       # PRD: shown in Find a Product result
    webpage_url      = models.URLField(blank=True)        # PRD: link to product webpage
    is_active        = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("name", "product_type")]

    def clean(self):
        if self.product_type == ProductType.TOPCOAT and not self.warranty_years:
            raise ValidationError("Topcoat products must have warranty_years set.")
        if self.product_type == ProductType.BASECOAT and self.warranty_years is not None:
            raise ValidationError("Basecoat products must not have warranty_years.")

class ProductImage(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image   = models.ForeignKey("core.Image", on_delete=models.PROTECT, related_name="product_images")

    class Meta:
        ordering = ["created"]
```

### `products/admin.py`
```python
@admin.register(Product)
class ProductAdmin(ModelAdmin):
    list_display  = ("id", "name", "product_type", "warranty_years", "is_active", "created")
    list_filter   = ("product_type", "is_active")
    list_editable = ("is_active",)
    search_fields = ("name",)
    actions       = ["activate_products", "deactivate_products"]

@admin.register(ProductImage)
class ProductImageAdmin(ModelAdmin):
    list_display  = ("id", "product", "created")
    raw_id_fields = ("product", "image")
```

### `products/api/v1/serializers.py`
```python
class ProductImageSerializer(ModelSerializer):
    image_url = SerializerMethodField()
    def get_image_url(self, obj): return obj.image.image.url

    class Meta:
        model  = ProductImage
        fields = ("id", "image_url", "created")

class ProductSerializer(ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model  = Product
        fields = ("id", "name", "product_type", "warranty_years",
                  "is_active", "images", "created", "modified")
        read_only_fields = ("id", "created", "modified")
```

### `products/api/v1/views.py`
```python
class ProductListCreateAPIView(ListCreateAPIView):
    queryset         = Product.objects.prefetch_related("images__image").all()
    filterset_fields = ["product_type", "is_active"]
    search_fields    = ["name"]
    ordering_fields  = ["name", "created"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminUser()]
        return [IsAuthenticated()]

class ProductRetrieveUpdateDestroyAPIView(RetrieveUpdateDestroyAPIView):
    queryset         = Product.objects.prefetch_related("images__image").all()
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAdminUser()]
        return [IsAuthenticated()]
```

### `products/api/v1/urls.py`
```python
urlpatterns = [
    path("", ProductListCreateAPIView.as_view(), name="product-list-create"),
    path("<int:pk>/", ProductRetrieveUpdateDestroyAPIView.as_view(), name="product-detail"),
]
```

### Data migration `migrations/0002_seed_products.py`
Seeds 26 products: 17 topcoats (with warranty_years) + 9 basecoats (warranty_years=None).

### Tests
```
✓ Unauthenticated GET → 401
✓ Authenticated GET returns paginated list with images
✓ Filter by product_type / is_active
✓ Search by name
✓ Non-admin POST → 403
✓ Admin creates topcoat with warranty_years → 201
✓ Admin creates basecoat (warranty_years=null) → 201
✓ Admin creates topcoat without warranty_years → 400
✓ Admin creates basecoat with warranty_years set → 400
✓ Admin PATCH / DELETE
```

### `products/api/v1/views.py` — additional endpoints

**`ProductImageListCreateAPIView`**
```python
class ProductImageListCreateAPIView(ListCreateAPIView):
    # POST /api/v1/products/{product_pk}/images/ → attach image to product
    queryset           = ProductImage.objects.select_related("image")
    serializer_class   = ProductImageSerializer
    permission_classes = [IsAdminUser]
```

**`ProductImageDestroyAPIView`**
```python
class ProductImageDestroyAPIView(DestroyAPIView):
    # DELETE /api/v1/products/{product_pk}/images/{id}/ → remove image
    queryset           = ProductImage.objects.select_related("image")
    permission_classes = [IsAdminUser]
```

**`SurfaceTypeListCreateAPIView`**
```python
class SurfaceTypeListCreateAPIView(ListCreateAPIView):
    # GET/POST /api/v1/products/surface-types/
    queryset           = SurfaceType.objects.all()
    serializer_class   = SurfaceTypeSerializer
    filterset_fields   = ["environment"]
    search_fields      = ["name"]
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminUser()]
        return [IsAuthenticated()]
```

**`SurfaceTypeRetrieveUpdateDestroyAPIView`**
```python
class SurfaceTypeRetrieveUpdateDestroyAPIView(RetrieveUpdateDestroyAPIView):
    # GET/PATCH/DELETE /api/v1/products/surface-types/{id}/
    queryset           = SurfaceType.objects.all()
    serializer_class   = SurfaceTypeSerializer
    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAdminUser()]
        return [IsAuthenticated()]
```

**`ProductSurfaceMappingListCreateAPIView`**
```python
class ProductSurfaceMappingListCreateAPIView(ListCreateAPIView):
    # GET/POST /api/v1/products/surface-mappings/
    queryset           = ProductSurfaceMapping.objects.select_related("product", "surface_type")
    serializer_class   = ProductSurfaceMappingSerializer
    filterset_fields   = ["product", "surface_type"]
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminUser()]
        return [IsAuthenticated()]
```

**`ProductSurfaceMappingDestroyAPIView`**
```python
class ProductSurfaceMappingDestroyAPIView(DestroyAPIView):
    # DELETE /api/v1/products/surface-mappings/{id}/
    queryset           = ProductSurfaceMapping.objects.select_related("product", "surface_type")
    permission_classes = [IsAdminUser]
```

Register all in `products/api/v1/urls.py`:
```python
urlpatterns += [
    path("surface-types/", SurfaceTypeListCreateAPIView.as_view(), name="surface-type-list-create"),
    path("surface-types/<int:pk>/", SurfaceTypeRetrieveUpdateDestroyAPIView.as_view(), name="surface-type-detail"),
    path("surface-mappings/", ProductSurfaceMappingListCreateAPIView.as_view(), name="surface-mapping-list-create"),
    path("surface-mappings/<int:pk>/", ProductSurfaceMappingDestroyAPIView.as_view(), name="surface-mapping-destroy"),
    path("<int:product_pk>/images/", ProductImageListCreateAPIView.as_view(), name="product-image-list-create"),
    path("<int:product_pk>/images/<int:pk>/", ProductImageDestroyAPIView.as_view(), name="product-image-destroy"),
]
```

### Amendment (PRD review)
**`SurfaceType`** model (also in `dulux_chatbot/products/`):
```python
class Environment(TextChoices):
    INTERIOR = "INTERIOR", "Interior"
    EXTERIOR = "EXTERIOR", "Exterior"

class SurfaceType(TimeStampedModel):
    name        = CharField(max_length=100)
    environment = CharField(max_length=10, choices=Environment, db_index=True)
    # e.g. Wood/Brick/Metal/Masonry (Exterior), Concrete/Plaster (Interior)

    class Meta:
        unique_together = [("name", "environment")]

class ProductSurfaceMapping(TimeStampedModel):
    product      = FK(Product, CASCADE)
    surface_type = FK(SurfaceType, CASCADE)
    class Meta:
        unique_together = [("product", "surface_type")]
```

---

## ✅ Chunk 2 — Warranty App: Models

### App scaffold
```
dulux_chatbot/warranty/
  __init__.py / apps.py / choices.py / models.py / admin.py / utils.py
  migrations/__init__.py
  services/__init__.py
  services/certificate.py  # stubbed
  tasks.py                 # Celery stubs
  api/v1/serializers.py / views.py / urls.py
  tests/factories.py / test_models.py / test_api.py
```
- Register `"dulux_chatbot.warranty"` in `CUSTOM_APPS`
- Add `path("api/v1/warranty/", include("dulux_chatbot.warranty.api.v1.urls"))` to `config/urls.py`

### `warranty/choices.py`
```python
class RegistrationState(TextChoices):
    SUBMITTED   = "SUBMITTED",   "Registration Submitted"
    IN_PROGRESS = "IN_PROGRESS", "Registration In Progress"
    APPROVED    = "APPROVED",    "Registration Approved"
    REJECTED    = "REJECTED",    "Registration Rejected"
    RESUBMIT    = "RESUBMIT",    "Registration Resubmit"

class RegistrationChannel(TextChoices):
    WHATSAPP = "WHATSAPP", "WhatsApp"
    WEB      = "WEB",      "Web"
    WEBFORM  = "WEBFORM",  "Webform"

class ClaimState(TextChoices):
    SUBMITTED = "SUBMITTED", "Claim Submitted"
    IN_REVIEW = "IN_REVIEW", "Claim In Review"
    QA_REVIEW = "QA_REVIEW", "Claim QA Review"
    APPROVED  = "APPROVED",  "Claim Approved"
    REJECTED  = "REJECTED",  "Claim Rejected"
    RESUBMIT  = "RESUBMIT",  "Claim Resubmit"

class IssueType(TextChoices):
    PEELING_CRACKING   = "PEELING_CRACKING",   "Peeling or Cracking"
    COLOR_FADING       = "COLOR_FADING",        "Color Fading or Flawed Color"
    ALGAE_FUNGUS       = "ALGAE_FUNGUS",        "Algae and Fungus Growth"
    WATER_INGRESS      = "WATER_INGRESS",       "Water Ingress"
    COVERAGE_VARIANCE  = "COVERAGE_VARIANCE",   "Coverage Variance"
    NON_UNIFORM_FINISH = "NON_UNIFORM_FINISH",  "Non-uniform or Patchy Finish"
    OTHERS             = "OTHERS",              "Others"

class InvoiceType(TextChoices):
    TOPCOAT  = "TOPCOAT",  "Topcoat Invoice"
    BASECOAT = "BASECOAT", "Basecoat Invoice"

### `warranty/utils.py`
```python
def generate_registration_code() -> str:
    while True:
        code = "".join(random.choices(string.digits, k=6))
        if not WarrantyRegistration.objects.filter(registration_code=code).exists():
            return code
```

### `warranty/models.py`

**WarrantyRegistration**
```python
class WarrantyRegistration(TimeStampedModel):
    registration_code       = CharField(max_length=6, unique=True, db_index=True, editable=False)
    channel                 = CharField(max_length=10, choices=RegistrationChannel, default="WHATSAPP")
    state                   = FSMField(default="SUBMITTED", choices=RegistrationState, protected=True, db_index=True)
    customer_name           = CharField(max_length=255)
    phone_number            = CharField(max_length=20, unique=True, db_index=True)
    email                   = EmailField()
    city                    = CharField(max_length=100)
    site_address            = TextField()
    purchase_date           = DateField()
    purchase_dealer         = CharField(max_length=255)
    purchase_dealer_address = TextField()
    postal_code             = CharField(max_length=20, blank=True)
    notes                   = TextField(blank=True)
    approved_by             = FK(AUTH_USER_MODEL, SET_NULL, null=True, blank=True)
    approved_at             = DateTimeField(null=True, blank=True)
    warranty_certificate    = FileField(upload_to="certificates/%Y/%m/", null=True, blank=True)

    # save(): auto-generate registration_code if empty

    # FSM transitions:
    # mark_in_progress(): SUBMITTED → IN_PROGRESS
    # approve():          [SUBMITTED, IN_PROGRESS, RESUBMIT] → APPROVED
    # reject():           [SUBMITTED, IN_PROGRESS, RESUBMIT] → REJECTED
    # request_resubmit(): [SUBMITTED, IN_PROGRESS] → RESUBMIT
```

**RegistrationPaintPair**
```python
class RegistrationPaintPair(TimeStampedModel):
    registration      = FK(WarrantyRegistration, CASCADE, related_name="paint_pairs")
    topcoat           = FK(Product, PROTECT, related_name="topcoat_pairs")
    topcoat_quantity  = DecimalField(max_digits=8, decimal_places=2)
    basecoat          = FK(Product, PROTECT, null=True, blank=True, related_name="basecoat_pairs")
    basecoat_quantity = DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ["created"]
```

**PaintPairInvoice**
```python
class PaintPairInvoice(TimeStampedModel):
    # Multiple invoices allowed per type per pair
    paint_pair   = FK(RegistrationPaintPair, CASCADE, related_name="invoices")
    image        = FK("core.Image", PROTECT, related_name="paint_pair_invoices")
    invoice_type = CharField(max_length=10, choices=InvoiceType)
```

**WarrantyClaim**
```python
class WarrantyClaim(TimeStampedModel):
    registration       = FK(WarrantyRegistration, PROTECT, related_name="claims")
    paint_pair         = FK(RegistrationPaintPair, PROTECT, related_name="claims")
    issue_type         = CharField(max_length=25, choices=IssueType)
    affected_area_sqft = DecimalField(max_digits=10, decimal_places=2)
    claim_date         = DateField(auto_now_add=True)
    state              = FSMField(default="SUBMITTED", choices=ClaimState, protected=True, db_index=True)
    notes              = TextField(blank=True)
    # No evoucher field — claim approval sends WhatsApp text notification only
    approved_by        = FK(AUTH_USER_MODEL, SET_NULL, null=True, blank=True)
    approved_at        = DateTimeField(null=True, blank=True)

    # FSM transitions:
    # mark_in_review():   SUBMITTED → IN_REVIEW
    # send_to_qa():       IN_REVIEW → QA_REVIEW
    # approve():          [IN_REVIEW, QA_REVIEW, RESUBMIT] → APPROVED
    # reject():           [IN_REVIEW, QA_REVIEW, RESUBMIT] → REJECTED
    # request_resubmit(): [IN_REVIEW, QA_REVIEW] → RESUBMIT
```

**ClaimImage** — PRD requires exactly 3 typed photos
```python
class PhotoType(TextChoices):        # in warranty/choices.py
    LONG_SHOT       = "LONG_SHOT",       "Long Shot"
    CLOSE_SHOT      = "CLOSE_SHOT",      "Close Shot"
    ALTERNATE_ANGLE = "ALTERNATE_ANGLE", "Alternate Angle"

class ClaimImage(TimeStampedModel):
    claim      = FK(WarrantyClaim, CASCADE, related_name="images")
    image      = FK("core.Image", PROTECT, related_name="claim_images")
    photo_type = CharField(max_length=20, choices=PhotoType)

    class Meta:
        ordering        = ["photo_type"]
        unique_together = [("claim", "photo_type")]   # one per type per claim
```

**RejectionField** — PRD requires field-level tracking for resubmission prompts
```python
class RejectionField(TimeStampedModel):
    # CS agent flags specific fields/images when requesting resubmission.
    # Chatbot reads this to re-prompt only rejected fields.
    registration = FK(WarrantyRegistration, CASCADE, related_name="rejection_fields")
    field_name = CharField(max_length=10, blank=True)
    note         = CharField(max_length=500, blank=True)

    class Meta:
        unique_together = [("registration")]
```

### Tests
```
✓ generate_registration_code returns unique 6-digit string
✓ save() auto-generates registration_code
✓ FSM transitions work correctly
✓ FSM protected — direct state assignment raises TransitionNotAllowed
✓ phone_number unique constraint enforced
✓ PaintPairInvoice allows multiple invoices per type per pair
```

---

## ✅ Chunk 3 — Warranty App: Admin

### `warranty/admin.py`
```python
@admin.register(WarrantyRegistration)
class WarrantyRegistrationAdmin(ModelAdmin):
    list_display    = ("registration_code", "customer_name", "phone_number",
                       "channel", "state", "purchase_date", "created")
    list_filter     = ("state", "channel")
    search_fields   = ("registration_code", "phone_number", "customer_name", "email")
    readonly_fields = ("registration_code", "state", "created", "modified",
                       "approved_by", "approved_at")
    date_hierarchy  = "created"
    ordering        = ("-created",)

@admin.register(RegistrationPaintPair)
class RegistrationPaintPairAdmin(ModelAdmin):
    list_display  = ("id", "registration", "topcoat", "topcoat_quantity",
                     "basecoat", "basecoat_quantity", "created")
    raw_id_fields = ("registration", "topcoat", "basecoat")

@admin.register(PaintPairInvoice)
class PaintPairInvoiceAdmin(ModelAdmin):
    list_display  = ("id", "paint_pair", "invoice_type", "created")
    list_filter   = ("invoice_type",)
    raw_id_fields = ("paint_pair", "image")

@admin.register(WarrantyClaim)
class WarrantyClaimAdmin(ModelAdmin):
    list_display    = ("id", "registration", "paint_pair", "issue_type",
                       "state", "claim_date", "created")
    list_filter     = ("state", "issue_type")
    search_fields   = ("registration__registration_code", "registration__phone_number")
    readonly_fields = ("state", "claim_date", "created", "modified",
                       "approved_by", "approved_at")
    raw_id_fields   = ("registration", "paint_pair")

@admin.register(ClaimImage)
class ClaimImageAdmin(ModelAdmin):
    list_display  = ("id", "claim", "created")
    raw_id_fields = ("claim", "image")
```

---

## ✅ Chunk 4 — Warranty App: Serializers

### Two creation paths
- **Chatbot**: validates step by step in flow handlers → creates DB records directly via `Model.objects.create()` in `@atomic` block at final step. No serializer needed.
- **CS Dashboard**: submits full payload in one POST → serializer validates everything at once.

### Registration Serializers (`warranty/api/v1/serializers.py`)

**`PaintPairInvoiceSerializer`** (read-only)
```python
fields: id, invoice_type, image_url (source="image.image.url")
```

**`RegistrationPaintPairSerializer`** (read-only/nested)
```python
invoices      = PaintPairInvoiceSerializer(many=True, read_only=True)
topcoat_name  = SerializerMethodField → obj.topcoat.name
basecoat_name = SerializerMethodField → obj.basecoat.name if obj.basecoat else None
fields: id, topcoat, topcoat_name, topcoat_quantity,
        basecoat, basecoat_name, basecoat_quantity, invoices, created
```

**`WarrantyRegistrationListSerializer`**
```python
fields: registration_code, customer_name, phone_number, channel, state, purchase_date, created
```

**`WarrantyRegistrationDetailSerializer`**
```python
paint_pairs       = RegistrationPaintPairSerializer(many=True, read_only=True)
approved_by_email = SerializerMethodField
fields: all WarrantyRegistration fields
```

**`WarrantyRegistrationCreateSerializer`** (CS Dashboard only)
```python
# Nested paint_pairs write
# validate_topcoat: product_type must be TOPCOAT + is_active=True
# validate_basecoat: product_type must be BASECOAT + is_active=True (if provided)
# validate_purchase_date: not future, within config.REGISTRATION_PURCHASE_DAYS_LIMIT days
# create(): @atomic — create WarrantyRegistration + RegistrationPaintPair records
# exclude: registration_code, state, warranty_certificate, approved_by, approved_at
```

**`RegistrationTransitionSerializer`**
```python
action = ChoiceField(["approve", "reject", "resubmit", "in_progress"])
notes  = CharField(max_length=1000, required=False, allow_blank=True)
# validate: action=reject or resubmit → notes required
```

### Claim Serializers

**`ClaimImageSerializer`** (read-only)
```python
fields: id, image_url (source="image.image.url"), created
```

**`WarrantyClaimListSerializer`**
```python
fields: id, registration_code (source="registration.registration_code"),
        topcoat_name (SerializerMethodField → paint_pair.topcoat.name),
        issue_type, affected_area_sqft, claim_date, state
```

**`WarrantyClaimDetailSerializer`**
```python
registration = WarrantyRegistrationListSerializer(read_only=True)
paint_pair   = RegistrationPaintPairSerializer(read_only=True)
images       = ClaimImageSerializer(many=True, read_only=True)
fields: all WarrantyClaim fields
```

**`WarrantyClaimCreateSerializer`** (CS Dashboard only)
```python
# validate_paint_pair: registration state must be APPROVED
# validate images: len >= config.MIN_CLAIM_PHOTOS
# create(): @atomic → WarrantyClaim + ClaimImage records
# exclude: state, approved_by, approved_at, claim_date
```

**`ClaimTransitionSerializer`**
```python
action = ChoiceField(["approve", "reject", "resubmit", "in_review", "qa_review"])
notes  = CharField(max_length=1000, required=False, allow_blank=True)
# validate: action=reject or resubmit → notes required
```

---

## ✅ Chunk 5 — Warranty App: Views + URLs + Tests

### `warranty/api/v1/views.py`

**`WarrantyRegistrationListCreateAPIView(ListCreateAPIView)`**
```python
queryset = WarrantyRegistration.objects.select_related("approved_by")
                               .prefetch_related(
                                   "paint_pairs__topcoat",
                                   "paint_pairs__basecoat",
                                   "paint_pairs__invoices__image",
                               )
permission_classes = [IsCSAgentOrAdmin]
filterset_fields   = ["state", "channel"]
search_fields      = ["registration_code", "phone_number", "customer_name"]
ordering_fields    = ["created", "purchase_date"]
ordering           = ["-created"]

# get_serializer_class():
#   list   → WarrantyRegistrationListSerializer
#   create → WarrantyRegistrationCreateSerializer
```

**`WarrantyRegistrationRetrieveAPIView(RetrieveAPIView)`**
```python
queryset = WarrantyRegistration.objects.select_related("approved_by").prefetch_related(
    "paint_pairs__topcoat",
    "paint_pairs__basecoat",
    "paint_pairs__invoices__image",
)
permission_classes = [IsCSAgentOrAdmin]
serializer_class = WarrantyRegistrationDetailSerializer
```

**`WarrantyRegistrationTransitionAPIView(GenericAPIView)`**
```python
# POST /api/v1/warranty/registrations/{id}/transition/
#   1. get_object()
#   2. validate RegistrationTransitionSerializer
#   3. call FSM method
#   4. update registration.notes
#   5. if approve → set approved_by + approved_at
#   6. registration.save()
#   7. if approve → generate_and_send_certificate.delay(registration.id)
#   8. if reject/resubmit → send_whatsapp_status_notification.delay(phone, notes)
#   9. return WarrantyRegistrationDetailSerializer response
```

**`WarrantyClaimListCreateAPIView(ListCreateAPIView)`**
```python
queryset = WarrantyClaim.objects.select_related(
    "registration", "paint_pair__topcoat", "paint_pair__basecoat", "approved_by"
).prefetch_related("images__image")
permission_classes = [IsAuthenticated]
filterset_fields   = ["state", "issue_type"]
search_fields      = ["registration__registration_code", "registration__phone_number"]
ordering           = ["-created"]
```

**`WarrantyClaimRetrieveAPIView(RetrieveAPIView)`**
```python
queryset = WarrantyClaim.objects.select_related(
    "registration", "paint_pair__topcoat", "paint_pair__basecoat", "approved_by"
).prefetch_related("images__image")
permission_classes = [IsAuthenticated]
serializer_class = WarrantyClaimDetailSerializer
```

**`WarrantyClaimTransitionAPIView(GenericAPIView)`**
```python
# POST /api/v1/warranty/claims/{id}/transition/
# same transition pattern, if approve → send_whatsapp_status_notification.delay(phone, msg)
```

### `warranty/api/v1/urls.py`
```python
urlpatterns = [
    path("registrations/", WarrantyRegistrationListCreateAPIView.as_view(), name="registration-list-create"),
    path("registrations/<int:pk>/", WarrantyRegistrationRetrieveAPIView.as_view(), name="registration-detail"),
    path("registrations/<int:pk>/transition/", WarrantyRegistrationTransitionAPIView.as_view(), name="registration-transition"),
    path("claims/", WarrantyClaimListCreateAPIView.as_view(), name="claim-list-create"),
    path("claims/<int:pk>/", WarrantyClaimRetrieveAPIView.as_view(), name="claim-detail"),
    path("claims/<int:pk>/transition/", WarrantyClaimTransitionAPIView.as_view(), name="claim-transition"),
]
```

### Tests (`warranty/tests/test_api.py`)
```
Registration:
✓ List requires authentication → 401 for unauthenticated user
✓ CS agent lists registrations (paginated)
✓ Filter by state / channel
✓ Search by registration_code / phone_number
✓ Create with 1 paint pair → 201, code auto-generated
✓ Create with 2 paint pairs → both pairs created
✓ Create with purchase_date > limit → 400
✓ Create with future purchase_date → 400
✓ Create with no paint_pairs → 400
✓ Create with basecoat product as topcoat → 400
✓ Transition: approve → APPROVED, Celery task called
✓ Transition: reject without notes → 400
✓ Transition: reject with notes → REJECTED
✓ Transition: invalid FSM (approve already-approved) → 400

Claims:
✓ Cannot create claim for non-APPROVED registration → 400
✓ Create with < MIN_CLAIM_PHOTOS images → 400
✓ Create with valid images → 201
✓ Transition: approve → APPROVED, WhatsApp notification sent
✓ Transition: send_to_qa → QA_REVIEW
```

---

## ✅ Chunk 6 — Complaints App + Django Channels

### App scaffold
```
dulux_chatbot/complaints/
  __init__.py / apps.py / choices.py / models.py / admin.py
  consumers.py / routing.py
  migrations/__init__.py
  api/v1/serializers.py / views.py / urls.py
  tests/test_api.py / test_consumers.py
```
- Register `"dulux_chatbot.complaints"` in `CUSTOM_APPS`
- Add `path("api/v1/complaints/", include("dulux_chatbot.complaints.api.v1.urls"))`
- Wire into `config/asgi.py`

### `complaints/choices.py`
```python
class ComplaintStatus(TextChoices):
    OPEN        = "OPEN",        "Open"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    RESOLVED    = "RESOLVED",    "Resolved"
    CLOSED      = "CLOSED",      "Closed"

class MessageSender(TextChoices):
    CUSTOMER = "CUSTOMER", "Customer"
    CS_AGENT = "CS_AGENT", "CS Agent"
```

### `complaints/models.py`

**Complaint**
```python
class Complaint(TimeStampedModel):
    registration  = FK(WarrantyRegistration, PROTECT, null=True, blank=True, related_name="complaints")
    phone_number  = CharField(max_length=20)
    customer_name = CharField(max_length=255)
    subject       = CharField(max_length=255)
    status        = FSMField(default="OPEN", choices=ComplaintStatus, protected=True, db_index=True)
    assigned_to   = FK(AUTH_USER_MODEL, SET_NULL, null=True, blank=True)
    closed_at     = DateTimeField(null=True, blank=True)
    closure_note  = CharField(max_length=500, blank=True)

    # FSM: assign() OPEN→IN_PROGRESS, resolve() IN_PROGRESS→RESOLVED,
    #       close() RESOLVED→CLOSED, reopen() [RESOLVED,CLOSED]→IN_PROGRESS
```

**ChatMessage** — always linked to a Complaint (non-nullable FK)
```python
class ChatMessage(TimeStampedModel):
    complaint = FK(Complaint, CASCADE, related_name="messages")
    sender    = CharField(max_length=10, choices=MessageSender)
    text      = TextField()

    class Meta:
        ordering = ["created"]
```

**ComplaintImage**
```python
class ComplaintImage(TimeStampedModel):
    complaint = FK(Complaint, CASCADE, related_name="images")
    image     = FK("core.Image", PROTECT, related_name="complaint_images")
```

### `complaints/consumers.py`
```python
class ComplaintChatConsumer(AsyncJsonWebsocketConsumer):
    # URL: ws/complaints/{complaint_id}/chat/
    # Auth: JWT token in query string → validated in connect()
    # Authenticated dashboard users only
    # Group: f"complaint_{complaint_id}"
    # connect(): authenticate, join group, accept()
    # receive_json(): validate text, create ChatMessage(sender=CS_AGENT), broadcast to group
    # disconnect(): leave group
    # chat_message(event): send_json(event["message"])
```

### `config/asgi.py`
```python
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(complaints_routing.websocket_urlpatterns)
    ),
})
```

### Generic API views
```python
class ComplaintListCreateAPIView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filterset_fields   = ["status"]
    search_fields      = ["phone_number", "customer_name", "subject"]

class ComplaintRetrieveAPIView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]

class ComplaintTransitionAPIView(GenericAPIView):
    # POST /api/v1/complaints/{id}/transition/
    # assign/resolve/close/reopen

class ComplaintMessageListCreateAPIView(ListCreateAPIView):
    # GET  → list ChatMessages ordered by created
    # POST → create ChatMessage(sender=CS_AGENT) + broadcast via channel_layer.group_send()
```

### Tests
```
✓ Create complaint
✓ Transition: open → in_progress → resolved → closed → reopen
✓ List + post messages via API
✓ WebSocket: connect with valid JWT → accepted
✓ WebSocket: connect without auth → rejected
✓ WebSocket: send message → ChatMessage created + broadcast
✓ Customer WhatsApp message → broadcast to CS group
```

---

## ✅ Chunk 7 — Chatbot: Models + WhatsApp Client + OTP

### App scaffold
```
dulux_chatbot/chatbot/
  __init__.py / apps.py / choices.py / models.py / admin.py
  migrations/__init__.py
  services/__init__.py
  services/whatsapp_client.py
  services/otp.py
  api/v1/views.py / urls.py
  tests/test_otp.py / test_whatsapp_client.py
```

### `chatbot/choices.py`
```python
class FlowType(TextChoices):
    REGISTRATION = "REGISTRATION", "Warranty Registration"
    CLAIM        = "CLAIM",        "Warranty Claim"
    FIND_PRODUCT = "FIND_PRODUCT", "Find a Product"
    COMPLAINT    = "COMPLAINT",    "Raise a Complaint"
    REISSUANCE   = "REISSUANCE",   "Certificate Reissuance"
```

### `chatbot/models.py`

**WhatsAppSession**
```python
class WhatsAppSession(TimeStampedModel):
    phone_number      = CharField(max_length=20, unique=True, db_index=True)
    flow              = CharField(max_length=15, choices=FlowType, null=True, blank=True)
    current_step      = CharField(max_length=50, default="menu")
    session_data      = JSONField(default=dict)
    is_phone_verified = BooleanField(default=False)
    otp_code          = CharField(max_length=6, blank=True)
    otp_expires_at    = DateTimeField(null=True, blank=True)
    last_activity     = DateTimeField(auto_now=True)
```

**ProcessedMessage** — idempotency guard
```python
class ProcessedMessage(models.Model):
    message_id   = CharField(max_length=100, unique=True, db_index=True)
    processed_at = DateTimeField(auto_now_add=True)
```

### `chatbot/services/whatsapp_client.py`
```python
class WhatsAppAPIError(Exception): ...

class WhatsAppClient:
    def send_text(to, text) -> dict
    def send_interactive_list(to, header, body, sections) -> dict
    def send_interactive_buttons(to, body, buttons) -> dict
    def send_document(to, document_url, filename, caption) -> dict
    def download_media(media_id) -> bytes
    def _post(endpoint, payload) -> dict:
        # timeout=config.WHATSAPP_API_TIMEOUT_SECS
        # catches RequestException → logs (no PII) → raises WhatsAppAPIError
```

### `chatbot/services/otp.py`
```python
def generate_and_send_otp(session, client) -> None:
    code = f"{secrets.randbelow(1_000_000):06d}"
    session.otp_code = code
    session.otp_expires_at = timezone.now() + timedelta(minutes=config.OTP_EXPIRY_MINUTES)
    session.save(update_fields=["otp_code", "otp_expires_at"])
    # OTP code never logged
    client.send_text(session.phone_number, f"Your code: {code}. Valid {config.OTP_EXPIRY_MINUTES} mins.")

def verify_otp(session, code) -> bool:
    # checks expiry + hmac.compare_digest (constant-time)
```

### Tests
```
✓ generate_and_send_otp sets 6-digit code + expiry
✓ verify_otp → True/False for correct/expired/wrong/empty code
✓ OTP never appears in logs
✓ WhatsApp client: correct payload, raises WhatsAppAPIError on failure, timeout passed
```

---

## ✅ Chunk 8 — Chatbot: Flow Engine + Webhook

### File structure
```
dulux_chatbot/chatbot/
  flows/base.py / registration.py / claim.py / find_product.py / complaint.py / reissuance.py
  handlers/message_parser.py / dispatcher.py
  tests/test_flows.py / test_webhook.py
```

### `flows/base.py` — BaseFlow (ABC)
```python
# handle() → dispatches to handle_{current_step}(), on missing handler: _send_error + _reset
# _advance_to(step): update current_step + save(update_fields)
# _save_data(key, value): update session_data[key] + save(update_fields)
# _reset(): clear flow, current_step="menu", session_data={}
```

### `flows/registration.py` — RegistrationFlow
Steps:
```
consent → otp_send → otp_verify →
name → email → city → site_address → purchase_date →
dealer_name → dealer_address →
topcoat_select → topcoat_quantity →
basecoat_select → basecoat_quantity →
add_more_pairs → invoice_upload → complete
```
- `handle_otp_verify`: retries up to `config.MAX_OTP_RETRIES`, then reset
- `handle_purchase_date`: parse DD/MM/YYYY | DD-MM-YYYY | YYYY-MM-DD, validate not future + within `config.REGISTRATION_PURCHASE_DAYS_LIMIT` days
- `handle_add_more_pairs`: YES → loop to topcoat_select; NO → invoice_upload
- `handle_invoice_upload`: `client.download_media()` → save `core.Image` → create `PaintPairInvoice`
- `handle_complete`: `@atomic` — `WarrantyRegistration.objects.create()` + `RegistrationPaintPair.objects.create()` per pair, reset session, send confirmation

### `flows/claim.py` — ClaimFlow
Steps: `registration_lookup → topcoat_select → issue_type → affected_area → photo_long_shot → photo_close_shot → photo_alternate_angle → complete`
- Each photo step validates image media, downloads via `client.download_media()`, saves as `core.Image`, creates `ClaimImage(photo_type=LONG_SHOT/CLOSE_SHOT/ALTERNATE_ANGLE)`
- `handle_complete`: `@atomic` — `WarrantyClaim.objects.create()` + 3 `ClaimImage` records

### `flows/find_product.py` — FindProductFlow
Steps: `interior_exterior_select → surface_type_select → result`  *(PRD: two-level selection)*
```python
# handle_interior_exterior_select():
#   send_interactive_buttons: "Interior" | "Exterior"
#   save_data("environment", value) → advance to surface_type_select

# handle_surface_type_select():
#   SurfaceType.objects.filter(environment=selected_env)
#   send as interactive list

# handle_result():
#   products = Product.objects.filter(
#       surface_mappings__surface_type=selected, is_active=True
#   ).prefetch_related("images__image")
#   For each product:
#     1. client.send_text(phone, f"{name}\n{features}\n{coverage_details}\n{webpage_url}")
#     2. for each image: client.send_document(phone, image.url, ...)
```

### `flows/complaint.py` — ComplaintFlow
Steps: `subject → description → image_upload → complete`  *(PRD: up to 3 images)*
- `handle_image_upload`: optional, loop up to 3 images; user can skip by typing "done"
- `handle_complete`: `@atomic` — create `Complaint` + `ComplaintImage` records
- Incoming messages after creation → `ChatMessage(sender=CUSTOMER)` + `channel_layer.group_send()`

### `flows/reissuance.py` — ReissuanceFlow
Steps: `phone_lookup → otp_send → otp_verify → complete`  *(PRD: OTP verification required)*
- `handle_complete`:
  - If `registration.warranty_certificate` exists → resend directly via `client.send_document()`
  - If missing → `generate_and_send_certificate.delay(registration.id)` to regenerate

### `handlers/message_parser.py`
```python
def parse_incoming_message(payload: dict) -> dict | None:
    # All access via .get() — never dict["key"]
    # Returns: {"message_id", "from", "type", "text", "media_id", "interactive_id"}
    # Returns None for non-user messages (delivery receipts etc.)
```

### `handlers/dispatcher.py`
```python
MENU_OPTIONS = {"1": REGISTRATION, "2": CLAIM, "3": FIND_PRODUCT, "4": COMPLAINT, "5": REISSUANCE}
# No flow → show main menu (5 interactive buttons)
# Flow set → route to correct flow class
```

### `api/v1/views.py` — WhatsAppWebhookView
```python
# GET: verify hub.mode + hmac.compare_digest(token, VERIFY_TOKEN) → challenge or 403
# POST:
#   1. parse_incoming_message() → None? return 200
#   2. ProcessedMessage.get_or_create(message_id) → duplicate? return 200
#   3. WhatsAppSession.get_or_create(phone_number)
#   4. try/except → log (no PII) + send error → always return 200
#   5. dispatch(session, message, WhatsAppClient())
```

### Tests
```
✓ consent NO → reset; OTP wrong 3x → reset
✓ invalid email/date → stays on step
✓ add_more_pairs YES → loops; complete() → DB records created
✓ claim: non-approved → error; complete() → WarrantyClaim + 3 typed ClaimImages
✓ claim: duplicate photo_type → error (unique_together enforced)
✓ find_product: interior→exterior→surface_type→result sends text + images one by one
✓ complaint: image upload optional (up to 3); incoming msg → ChatMessage + broadcast
✓ reissuance: existing certificate resent directly; missing → regenerated
✓ resubmission: RejectionField records read to prompt only rejected fields
✓ dispatcher: correct routing + menu fallback
✓ webhook: GET verify, duplicate message_id, non-message payload, exception → all 200
```

---

## ✅ Chunk 9 — Document Generation (Celery PDFs)

### `warranty/services/pdf.py` *(single file — merged per PRD)*

**`generate_warranty_certificate(registration) -> ContentFile`**
```
ReportLab PDF layout:
  Header: AkzoNobel logo | Dulux logo | "E-WARRANTY CERTIFICATE"
  Customer: Name | Mobile | Site Address | Purchase Date (DD/MM/YYYY)
  Topcoat Table: Sr.No | Product Name | Qty (L) | Warranty Years
    → one row per RegistrationPaintPair topcoat (NO basecoat per spec)
  Registration: WARRANTY REG NO. | Issuance Date (today)
  Footer: Website | WhatsApp | Call Center | T&C
  Excluded: basecoat details, batch number, price paid
```

### `warranty/tasks.py`
```python
@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_and_send_certificate(self, registration_id: int) -> None:
    # 1. fetch registration + prefetch paint_pairs__topcoat
    # 2. generate_warranty_certificate() → ContentFile
    # 3. registration.warranty_certificate.save(filename, content)
    # 4. client.send_document(phone, url, "warranty_certificate.pdf")
    # self.retry(exc) on failure

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_whatsapp_status_notification(self, phone: str, message: str) -> None:
    # Generic WhatsApp text notification
    # Used for: claim approval, rejection, resubmit requests, registration rejection/resubmit
```

### Download endpoint (addition to Chunk 5 views)
```python
class WarrantyRegistrationCertificateDownloadAPIView(GenericAPIView):
    # GET /api/v1/warranty/registrations/{id}/download-certificate/
    # FileResponse(registration.warranty_certificate) or 404
```

### Tests
```
✓ generate_warranty_certificate returns ContentFile with PDF bytes
✓ Certificate contains topcoat data, does NOT contain basecoat details
✓ Celery task: saves to FileField + WhatsApp send called
✓ Celery task: retries on WhatsAppAPIError
✓ Reissuance: existing certificate resent; missing triggers regeneration
✓ Claim approval → WhatsApp text notification sent (no PDF)
✓ Download endpoint: 200 with file, 404 if not generated yet
```

---

## ✅ Chunk 10 — Legacy Data Import (Management Command)

No import app, no API, no UI. Admin provides Excel/CSV file and we run the command.

### `dulux_chatbot/core/management/commands/import_legacy_data.py`
```python
# Usage:
#   python manage.py import_legacy_data --file=registrations.xlsx --type=registrations
#   python manage.py import_legacy_data --file=claims.xlsx --type=claims

class Command(BaseCommand):
    help = "Import legacy warranty registrations or claims from Excel/CSV"

    def add_arguments(self, parser):
        parser.add_argument("--file", required=True)
        parser.add_argument("--type", choices=["registrations", "claims"], required=True)

    def handle(self, *args, **options):
        # 1. Read file via openpyxl (.xlsx) or csv (.csv)
        # 2. Preload product_cache + registration_cache (avoid N+1)
        # 3. Process in chunks of config.IMPORT_CHUNK_SIZE inside @atomic
        # 4. Validate each row — skip + log errors on failure
        # 5. Print summary: X succeeded, Y failed
        # 6. Print row-level error details for failed rows
```

### Validation rules
**Registrations:** required fields present, email format, purchase_date parseable, topcoat/basecoat names match active products, quantities positive

**Claims:** registration_code exists + APPROVED, topcoat_name valid, issue_type valid choice, affected_area_sqft positive, claim_date parseable

### No tests needed — one-time migration script, verified by running against sample data

---

## ✅ Chunk 11 — Cleanup + Integration

### `config/urls.py` — final state
```python
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/core/", include("dulux_chatbot.core.api.v1.urls")),
    path("api/v1/users/", include("dulux_chatbot.users.api.v1.urls")),
    path("api/v1/products/", include("dulux_chatbot.products.api.v1.urls")),
    path("api/v1/warranty/", include("dulux_chatbot.warranty.api.v1.urls")),
    path("api/v1/complaints/", include("dulux_chatbot.complaints.api.v1.urls")),
    path("api/v1/chatbot/", include("dulux_chatbot.chatbot.api.v1.urls")),
    # + swagger, email confirmation, password reset (existing)
]
```


### `config/settings/base.py` — final `CUSTOM_APPS`
```python
CUSTOM_APPS = [
    "daphne",                       # must be first for ASGI
    "dulux_chatbot.core",
    "dulux_chatbot.users",
    "dulux_chatbot.products",
    "dulux_chatbot.warranty",
    "dulux_chatbot.complaints",
    "dulux_chatbot.chatbot",
]
```

### `config/asgi.py` — wire Django Channels
```python
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(complaints_routing.websocket_urlpatterns)
    ),
})
```

### Docker volume names fix
Update `docker-compose.dev.yml` + `docker-compose.stage.yml` — rename `project_*` volumes → `dulux_chatbot_*`

### Swagger tags
Add `tags` on each API view: Products, Warranty Registrations, Warranty Claims, Complaints, WhatsApp Chatbot

### Final checks
```bash
python manage.py makemigrations --check
python manage.py test dulux_chatbot --verbosity=2
```
