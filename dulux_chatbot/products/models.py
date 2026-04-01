from django.db import models
from django_extensions.db.models import TimeStampedModel

from dulux_chatbot.products.choices import Environment, ProductType


class Product(TimeStampedModel):
    name = models.CharField(max_length=255)
    product_type = models.CharField(max_length=10, choices=ProductType.choices)
    warranty_years = models.PositiveSmallIntegerField()
    features = models.TextField()
    coverage_details = models.TextField()
    webpage_url = models.URLField()
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [("name", "product_type")]

    def __str__(self) -> str:
        return self.name


class ProductImage(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ForeignKey("core.Image", on_delete=models.PROTECT, related_name="product_images")

    class Meta:
        unique_together = [("product", "image")]

    def __str__(self) -> str:
        return f"{self.product} image {self.image_id}"


class SurfaceType(TimeStampedModel):
    name = models.CharField(max_length=100)
    environment = models.CharField(max_length=10, choices=Environment.choices)

    class Meta:
        unique_together = [("name", "environment")]

    def __str__(self) -> str:
        return f"{self.name} ({self.environment})"


class ProductSurfaceMapping(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="surface_mappings")
    surface_type = models.ForeignKey(SurfaceType, on_delete=models.CASCADE, related_name="product_mappings")

    class Meta:
        unique_together = [("product", "surface_type")]

    def __str__(self) -> str:
        return f"{self.product} -> {self.surface_type}"
