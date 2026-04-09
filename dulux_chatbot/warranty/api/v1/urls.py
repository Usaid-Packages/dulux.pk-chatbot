from django.urls import path

from dulux_chatbot.warranty.api.v1.views import (
    ClaimCardCountsAPIView,
    ClaimCSRResubmissionAPIView,
    ClaimQualityApproveAPIView,
    ClaimQualityRejectAPIView,
    ClaimQualityRequestInfoAPIView,
    QualityCardCountsAPIView,
    RegistrationCardCountsAPIView,
    WarrantyClaimListCreateAPIView,
    WarrantyClaimRetrieveUpdateAPIView,
    WarrantyRegistrationListCreateAPIView,
    WarrantyRegistrationRetrieveUpdateAPIView,
)


urlpatterns = [
    path("registrations/", WarrantyRegistrationListCreateAPIView.as_view(), name="registration_list_create"),
    path(
        "card-counts/registrations/",
        RegistrationCardCountsAPIView.as_view(),
        name="registration_card_counts",
    ),
    path("registrations/<int:pk>/", WarrantyRegistrationRetrieveUpdateAPIView.as_view(), name="registration_detail"),
    path("claims/", WarrantyClaimListCreateAPIView.as_view(), name="claim_list_create"),
    path("card-counts/claims/", ClaimCardCountsAPIView.as_view(), name="claim_card_counts"),
    path("card-counts/quality/", QualityCardCountsAPIView.as_view(), name="quality_card_counts"),
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
