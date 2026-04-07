from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.exceptions import ValidationError

from dulux_chatbot.core.permissions import IsAdminUser
from dulux_chatbot.products.api.v1.serializers import (
    ProductBasecoatSerializer,
    ProductImageSerializer,
    ProductSerializer,
    SurfaceTypeSerializer,
)
from dulux_chatbot.products.choices import ProductType
from dulux_chatbot.products.models import Product, ProductImage, SurfaceType


class ProductListCreateAPIView(generics.ListCreateAPIView):
    queryset = Product.objects.prefetch_related(
        "images__image", "surface_mappings__surface_type", "basecoat_mappings__basecoat"
    ).all()
    serializer_class = ProductSerializer
    filterset_fields = ["product_type", "is_active"]
    search_fields = ["name"]
    ordering_fields = ["name", "created"]

    def get_permissions(self):
        permissions = super().get_permissions()
        if self.request.method == "POST":
            permissions.append(IsAdminUser())
        return permissions


class ProductRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.prefetch_related(
        "images__image", "surface_mappings__surface_type", "basecoat_mappings__basecoat"
    ).all()
    serializer_class = ProductSerializer

    def get_permissions(self):
        permissions = super().get_permissions()
        if self.request.method in {"PUT", "PATCH", "DELETE"}:
            permissions.append(IsAdminUser())
        return permissions

    def perform_destroy(self, instance: Product) -> None:
        try:
            super().perform_destroy(instance)
        except ProtectedError as exc:
            raise ValidationError(
                {
                    "detail": (
                        "Product cannot be deleted because it is linked to existing warranty registrations, claims, "
                        "or product mappings."
                    )
                }
            ) from exc


class ProductBasecoatListAPIView(generics.ListAPIView):
    serializer_class = ProductBasecoatSerializer

    def get_queryset(self):
        product = get_object_or_404(
            Product.objects.prefetch_related("basecoat_mappings__basecoat"),
            pk=self.kwargs.get("pk"),
        )
        if product.product_type != ProductType.TOPCOAT:
            raise ValidationError({"detail": "Basecoat list is only available for TOPCOAT products."})
        return Product.objects.filter(topcoat_mappings__topcoat=product).order_by("name")


class ProductImageListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ProductImageSerializer

    def get_queryset(self):
        product_id = self.kwargs.get("product_pk")
        return ProductImage.objects.select_related("image", "product").filter(product_id=product_id)

    def get_permissions(self):
        permissions = super().get_permissions()
        if self.request.method == "POST":
            permissions.append(IsAdminUser())
        return permissions

    def perform_create(self, serializer: ProductImageSerializer) -> None:
        product = get_object_or_404(Product, pk=self.kwargs.get("product_pk"))
        serializer.save(product=product)


class ProductImageDestroyAPIView(generics.DestroyAPIView):
    serializer_class = ProductImageSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        product_id = self.kwargs.get("product_pk")
        return ProductImage.objects.select_related("image", "product").filter(product_id=product_id)


class SurfaceTypeListCreateAPIView(generics.ListCreateAPIView):
    queryset = SurfaceType.objects.all()
    serializer_class = SurfaceTypeSerializer
    filterset_fields = ["environment"]
    search_fields = ["name"]

    def get_permissions(self):
        permissions = super().get_permissions()
        if self.request.method == "POST":
            permissions.append(IsAdminUser())
        return permissions


class SurfaceTypeRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SurfaceType.objects.all()
    serializer_class = SurfaceTypeSerializer

    def get_permissions(self):
        permissions = super().get_permissions()
        if self.request.method in {"PUT", "PATCH", "DELETE"}:
            permissions.append(IsAdminUser())
        return permissions
