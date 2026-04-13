from django.urls import path

from dulux_chatbot.products.api.v1.views import (
    ProductBasecoatListAPIView,
    ProductImageDestroyAPIView,
    ProductImageListCreateAPIView,
    ProductListCreateAPIView,
    ProductRetrieveUpdateDestroyAPIView,
    ProductWarrantyOptionListAPIView,
    SurfaceTypeListCreateAPIView,
    SurfaceTypeRetrieveUpdateDestroyAPIView,
)


urlpatterns = [
    path("", ProductListCreateAPIView.as_view(), name="product_list_create"),
    path("warranty-options/", ProductWarrantyOptionListAPIView.as_view(), name="product_warranty_option_list"),
    path("<int:pk>/", ProductRetrieveUpdateDestroyAPIView.as_view(), name="product_detail"),
    path("<int:pk>/basecoats/", ProductBasecoatListAPIView.as_view(), name="product_basecoat_list"),
    path("<int:product_pk>/images/", ProductImageListCreateAPIView.as_view(), name="product_image_list_create"),
    path("<int:product_pk>/images/<int:pk>/", ProductImageDestroyAPIView.as_view(), name="product_image_destroy"),
    path("surface-types/", SurfaceTypeListCreateAPIView.as_view(), name="surface_type_list_create"),
    path("surface-types/<int:pk>/", SurfaceTypeRetrieveUpdateDestroyAPIView.as_view(), name="surface_type_detail"),
]
