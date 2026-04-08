from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from dulux_chatbot.core.permissions import IsCSAgentOrAdmin, IsQualityReviewerOrAdmin
from dulux_chatbot.warranty.api.v1.serializers import (
    ClaimCSRResubmissionCreateSerializer,
    ClaimQualityApproveSerializer,
    ClaimQualityRejectSerializer,
    ClaimQualityRequestInfoSerializer,
    ClaimResubmissionRequestSerializer,
    WarrantyClaimCreateSerializer,
    WarrantyClaimDetailSerializer,
    WarrantyClaimListSerializer,
    WarrantyClaimUpdateSerializer,
    WarrantyRegistrationCreateSerializer,
    WarrantyRegistrationDetailSerializer,
    WarrantyRegistrationListSerializer,
    WarrantyRegistrationUpdateSerializer,
)
from dulux_chatbot.warranty.models import WarrantyClaim, WarrantyRegistration


class WarrantyRegistrationListCreateAPIView(generics.ListCreateAPIView):
    queryset = WarrantyRegistration.objects.select_related("approved_by").prefetch_related(
        "paint_pairs__topcoat",
        "paint_pairs__basecoat",
        "invoices__image",
    )
    filterset_fields = ["state", "channel"]
    search_fields = ["registration_code", "phone_number", "customer_name"]
    ordering_fields = ["created", "purchase_date"]
    ordering = ["-created"]
    permission_classes = [IsAuthenticated, IsCSAgentOrAdmin]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return WarrantyRegistrationCreateSerializer
        return WarrantyRegistrationListSerializer


class WarrantyRegistrationRetrieveUpdateAPIView(generics.RetrieveUpdateAPIView):
    queryset = WarrantyRegistration.objects.select_related("approved_by").prefetch_related(
        "paint_pairs__topcoat",
        "paint_pairs__basecoat",
        "invoices__image",
    )
    permission_classes = [IsAuthenticated, IsCSAgentOrAdmin]

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return WarrantyRegistrationUpdateSerializer
        return WarrantyRegistrationDetailSerializer


class WarrantyClaimListCreateAPIView(generics.ListCreateAPIView):
    queryset = WarrantyClaim.objects.select_related(
        "registration",
        "paint_pair__topcoat",
        "paint_pair__basecoat",
        "approved_by",
    ).prefetch_related("images__image", "quality_reviews")
    filterset_fields = ["state", "issue_type"]
    search_fields = ["registration__registration_code", "registration__phone_number"]
    ordering = ["-created"]
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return WarrantyClaimCreateSerializer
        return WarrantyClaimListSerializer


class WarrantyClaimRetrieveUpdateAPIView(generics.RetrieveUpdateAPIView):
    queryset = WarrantyClaim.objects.select_related(
        "registration",
        "paint_pair__topcoat",
        "paint_pair__basecoat",
        "approved_by",
    ).prefetch_related(
        "images__image",
        "quality_reviews__required_items",
        "resubmissions__entries__image",
    )
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = super().get_permissions()
        if self.request.method in {"PUT", "PATCH"}:
            permissions.append(IsCSAgentOrAdmin())
        return permissions

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return WarrantyClaimUpdateSerializer
        return WarrantyClaimDetailSerializer


class ClaimActionAPIView(generics.GenericAPIView):
    queryset = WarrantyClaim.objects.select_related(
        "registration",
        "paint_pair__topcoat",
        "paint_pair__basecoat",
        "approved_by",
    ).prefetch_related(
        "images__image",
        "quality_reviews__required_items",
        "resubmissions__entries__image",
    )
    detail_serializer_class = WarrantyClaimDetailSerializer

    def _build_response(self, claim: WarrantyClaim) -> Response:
        serializer = self.detail_serializer_class(claim, context=self.get_serializer_context())
        return Response(serializer.data, status=status.HTTP_200_OK)


class ClaimQualityApproveAPIView(ClaimActionAPIView):
    serializer_class = ClaimQualityApproveSerializer
    permission_classes = [IsAuthenticated, IsQualityReviewerOrAdmin]

    def post(self, request, *args, **kwargs):
        claim = self.get_object()
        serializer = self.get_serializer(data=request.data, context={**self.get_serializer_context(), "claim": claim})
        serializer.is_valid(raise_exception=True)
        claim = serializer.save()
        return self._build_response(claim)


class ClaimQualityRejectAPIView(ClaimActionAPIView):
    serializer_class = ClaimQualityRejectSerializer
    permission_classes = [IsAuthenticated, IsQualityReviewerOrAdmin]

    def post(self, request, *args, **kwargs):
        claim = self.get_object()
        serializer = self.get_serializer(data=request.data, context={**self.get_serializer_context(), "claim": claim})
        serializer.is_valid(raise_exception=True)
        claim = serializer.save()
        return self._build_response(claim)


class ClaimQualityRequestInfoAPIView(ClaimActionAPIView):
    serializer_class = ClaimQualityRequestInfoSerializer
    permission_classes = [IsAuthenticated, IsQualityReviewerOrAdmin]

    def post(self, request, *args, **kwargs):
        claim = self.get_object()
        serializer = self.get_serializer(data=request.data, context={**self.get_serializer_context(), "claim": claim})
        serializer.is_valid(raise_exception=True)
        claim = serializer.save()
        return self._build_response(claim)


class ClaimCSRResubmissionAPIView(ClaimActionAPIView):
    serializer_class = ClaimCSRResubmissionCreateSerializer
    permission_classes = [IsAuthenticated, IsCSAgentOrAdmin]

    def get(self, request, *args, **kwargs):
        claim = self.get_object()
        payload = ClaimResubmissionRequestSerializer.build_from_claim(claim)
        serializer = ClaimResubmissionRequestSerializer(payload)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        claim = self.get_object()
        serializer = self.get_serializer(data=request.data, context={**self.get_serializer_context(), "claim": claim})
        serializer.is_valid(raise_exception=True)
        claim = serializer.save()
        return self._build_response(claim)
