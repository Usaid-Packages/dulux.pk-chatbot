from django.contrib.auth import get_user_model

from dulux_chatbot.core.models import Image
from dulux_chatbot.products.choices import Environment, ProductType
from dulux_chatbot.products.models import Product, ProductBasecoat, ProductImage, ProductSurfaceMapping, SurfaceType
from dulux_chatbot.users.choices import UserRole


User = get_user_model()


def create_user(*, email: str, role: str):
    return User.objects.create_user(
        email=email,
        password="test-password-123",
        role=role,
    )


def create_product(
    *,
    name: str = "Dulux Test Topcoat",
    product_type: str = ProductType.TOPCOAT,
    warranty_years: int = 5,
    features: str = "Durable finish",
    coverage_details: str = "100 sqft per liter",
    webpage_url: str = "https://example.com/products/test",
    is_active: bool = True,
) -> Product:
    return Product.objects.create(
        name=name,
        product_type=product_type,
        warranty_years=warranty_years,
        features=features,
        coverage_details=coverage_details,
        webpage_url=webpage_url,
        is_active=is_active,
    )


def create_surface_type(
    *,
    name: str = "Wood",
    environment: str = Environment.EXTERIOR,
) -> SurfaceType:
    return SurfaceType.objects.create(name=name, environment=environment)


def create_product_surface_mapping(*, product: Product, surface_type: SurfaceType) -> ProductSurfaceMapping:
    return ProductSurfaceMapping.objects.create(product=product, surface_type=surface_type)


def create_product_basecoat(*, topcoat: Product, basecoat: Product) -> ProductBasecoat:
    return ProductBasecoat.objects.create(topcoat=topcoat, basecoat=basecoat)


def create_image(*, image_name: str = "products/test.jpg") -> Image:
    return Image.objects.create(image=image_name)


def attach_product_image(*, product: Product, image: Image | None = None) -> ProductImage:
    product_image = image or create_image()
    return ProductImage.objects.create(product=product, image=product_image)


def create_admin_user(*, email: str = "admin@example.com"):
    return create_user(email=email, role=UserRole.ADMIN)


def create_cs_user(*, email: str = "agent@example.com"):
    return create_user(email=email, role=UserRole.CS_AGENT)
