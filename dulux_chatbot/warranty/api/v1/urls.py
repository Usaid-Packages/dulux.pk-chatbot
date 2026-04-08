from django.urls import path

from dulux_chatbot.warranty.api.v1.views import (
    ClaimCSRResubmissionAPIView,
    ClaimQualityApproveAPIView,
    ClaimQualityRejectAPIView,
    ClaimQualityRequestInfoAPIView,
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
    path("claims/<int:pk>/quality/approve/", ClaimQualityApproveAPIView.as_view(), name="claim_quality_approve"),
    path("claims/<int:pk>/quality/reject/", ClaimQualityRejectAPIView.as_view(), name="claim_quality_reject"),
    path(
        "claims/<int:pk>/csr-resubmission/",
        ClaimCSRResubmissionAPIView.as_view(),
        name="claim_csr_resubmission",
    ),
    path(
        "claims/<int:pk>/quality/request-info/",
        ClaimQualityRequestInfoAPIView.as_view(),
        name="claim_quality_request_info",
    ),
]
