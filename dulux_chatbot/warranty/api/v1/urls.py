from django.urls import path

from dulux_chatbot.warranty.api.v1.views import (
    WarrantyClaimListCreateAPIView,
    WarrantyClaimRetrieveUpdateAPIView,
    WarrantyRegistrationListCreateAPIView,
    WarrantyRegistrationRetrieveUpdateAPIView,
)


urlpatterns = [
    path("registrations/", WarrantyRegistrationListCreateAPIView.as_view(), name="registration_list_create"),
    path("registrations/<int:pk>/", WarrantyRegistrationRetrieveUpdateAPIView.as_view(), name="registration_detail"),
    path("claims/", WarrantyClaimListCreateAPIView.as_view(), name="claim_list_create"),
    path("claims/<int:pk>/", WarrantyClaimRetrieveUpdateAPIView.as_view(), name="claim_detail"),
]
