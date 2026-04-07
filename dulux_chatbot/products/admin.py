from django.contrib import admin

from dulux_chatbot.products.models import Product, ProductBasecoat, ProductImage, ProductSurfaceMapping, SurfaceType


@admin.action(description="Activate selected products")
def activate_products(_modeladmin, _request, queryset):
    queryset.update(is_active=True)


@admin.action(description="Deactivate selected products")
def deactivate_products(_modeladmin, _request, queryset):
    queryset.update(is_active=False)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "product_type", "warranty_years", "is_active", "created")
    list_filter = ("product_type", "is_active")
    list_editable = ("is_active",)
    search_fields = ("name",)
    raw_id_fields = ("basecoats",)
    actions = (activate_products, deactivate_products)


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "image", "created")
    raw_id_fields = ("product", "image")


@admin.register(SurfaceType)
class SurfaceTypeAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "environment", "created")
    list_filter = ("environment",)
    search_fields = ("name",)


@admin.register(ProductSurfaceMapping)
class ProductSurfaceMappingAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "surface_type", "created")
    raw_id_fields = ("product", "surface_type")


@admin.register(ProductBasecoat)
class ProductBasecoatAdmin(admin.ModelAdmin):
    list_display = ("id", "topcoat", "basecoat", "created")
    raw_id_fields = ("topcoat", "basecoat")
