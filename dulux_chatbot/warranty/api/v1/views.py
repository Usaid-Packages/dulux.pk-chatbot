from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from dulux_chatbot.core.permissions import IsCSAgentOrAdmin
from dulux_chatbot.warranty.api.v1.serializers import (
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
    ).prefetch_related("images__image")
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
    ).prefetch_related("images__image")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return WarrantyClaimUpdateSerializer
        return WarrantyClaimDetailSerializer
