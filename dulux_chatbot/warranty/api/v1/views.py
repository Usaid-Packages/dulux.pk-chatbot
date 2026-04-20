from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from dulux_chatbot.core.permissions import IsCSAgentOrAdmin, IsQualityReviewerOrAdmin
from dulux_chatbot.users.choices import UserRole
from dulux_chatbot.warranty.api.v1.serializers import (
    CardCountQuerySerializer,
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
from dulux_chatbot.warranty.choices import ClaimState, RegistrationState
from dulux_chatbot.warranty.models import ClaimQualityReview, ClaimResubmission, WarrantyClaim, WarrantyRegistration


def latest_quality_review_prefetch(*, with_required_items: bool = False) -> Prefetch:
    queryset = ClaimQualityReview.objects.order_by("-created", "-id")
    if with_required_items:
        queryset = queryset.prefetch_related("required_items")
    return Prefetch("quality_reviews", queryset=queryset[:1], to_attr="latest_quality_reviews")


def latest_resubmission_prefetch() -> Prefetch:
    return Prefetch(
        "resubmissions",
        queryset=ClaimResubmission.objects.prefetch_related("entries__image").order_by("-created", "-id")[:1],
        to_attr="latest_resubmissions",
    )


class CardCountBaseAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def _filter_registrations(self, validated_data: dict):
        queryset = WarrantyRegistration.objects.all()
        if validated_data.get("date_from"):
            queryset = queryset.filter(created__date__gte=validated_data["date_from"])
        if validated_data.get("date_to"):
            queryset = queryset.filter(created__date__lte=validated_data["date_to"])
        if validated_data.get("agent_id"):
            queryset = queryset.filter(approved_by_id=validated_data["agent_id"])
        return queryset

    def _filter_claims(self, validated_data: dict):
        queryset = WarrantyClaim.objects.all()
        if validated_data.get("date_from"):
            queryset = queryset.filter(created__date__gte=validated_data["date_from"])
        if validated_data.get("date_to"):
            queryset = queryset.filter(created__date__lte=validated_data["date_to"])
        if validated_data.get("agent_id"):
            queryset = queryset.filter(approved_by_id=validated_data["agent_id"])
        return queryset


class RegistrationCardCountsAPIView(CardCountBaseAPIView):
    permission_classes = [IsAuthenticated, IsCSAgentOrAdmin]

    def get(self, request, *args, **kwargs):
        serializer = CardCountQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        queryset = self._filter_registrations(serializer.validated_data)
        counts = queryset.aggregate(
            total_registrations=Count("id"),
            pending_review=Count("id", filter=Q(state__in=(RegistrationState.SUBMITTED, RegistrationState.RESUBMIT))),
            approved=Count("id", filter=Q(state=RegistrationState.APPROVED)),
        )
        return Response({key: int(value or 0) for key, value in counts.items()}, status=status.HTTP_200_OK)


class ClaimCardCountsAPIView(CardCountBaseAPIView):
    permission_classes = [IsAuthenticated, IsCSAgentOrAdmin]

    def get(self, request, *args, **kwargs):
        serializer = CardCountQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        queryset = self._filter_claims(serializer.validated_data)
        counts = queryset.aggregate(
            total_claims=Count("id"),
            pending_cs_review=Count("id", filter=Q(state__in=(ClaimState.SUBMITTED, ClaimState.RESUBMIT))),
            forwarded_to_quality=Count(
                "id",
                filter=Q(
                    state__in=(
                        ClaimState.QA_REVIEW,
                        ClaimState.QA_APPROVED,
                        ClaimState.QA_REJECTED,
                    )
                ),
            ),
            resolved=Count("id", filter=Q(state__in=(ClaimState.APPROVED, ClaimState.REJECTED))),
        )
        return Response({key: int(value or 0) for key, value in counts.items()}, status=status.HTTP_200_OK)


class QualityCardCountsAPIView(CardCountBaseAPIView):
    permission_classes = [IsAuthenticated, IsQualityReviewerOrAdmin]

    def get(self, request, *args, **kwargs):
        serializer = CardCountQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        queryset = self._filter_claims(serializer.validated_data)
        counts = queryset.aggregate(
            total_in_queue=Count(
                "id",
                filter=Q(
                    state__in=(
                        ClaimState.QA_REVIEW,
                        ClaimState.RESUBMIT,
                        ClaimState.QA_APPROVED,
                        ClaimState.QA_REJECTED,
                    )
                ),
            ),
            awaiting_review=Count("id", filter=Q(state=ClaimState.QA_REVIEW)),
            info_requested=Count("id", filter=Q(state=ClaimState.RESUBMIT)),
        )
        payload = {key: int(value or 0) for key, value in counts.items()}
        payload["resolved_today"] = queryset.filter(
            state__in=(ClaimState.QA_APPROVED, ClaimState.QA_REJECTED),
            modified__date=timezone.localdate(),
        ).count()
        return Response(payload, status=status.HTTP_200_OK)


class WarrantyRegistrationListCreateAPIView(generics.ListCreateAPIView):
    queryset = WarrantyRegistration.objects.all()
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
        "rejection_fields",
    )

    def get_permissions(self):
        permissions = super().get_permissions()
        if self.request.method in {"PUT", "PATCH"}:
            permissions.append(IsCSAgentOrAdmin())
        return permissions

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return WarrantyRegistrationUpdateSerializer
        return WarrantyRegistrationDetailSerializer


class WarrantyClaimListCreateAPIView(generics.ListCreateAPIView):
    queryset = WarrantyClaim.objects.select_related(
        "registration",
        "paint_pair__topcoat",
        "paint_pair__basecoat",
        "paint_pair__registration",
        "approved_by",
    ).prefetch_related("images__image", latest_quality_review_prefetch())
    filterset_fields = ["state", "issue_type"]
    search_fields = ["registration__registration_code", "registration__phone_number"]
    ordering = ["-created"]
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = super().get_permissions()
        if self.request.method == "POST":
            permissions.append(IsCSAgentOrAdmin())
        return permissions

    def get_serializer_class(self):
        if self.request.method == "POST":
            return WarrantyClaimCreateSerializer
        return WarrantyClaimListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == UserRole.QUALITY_REVIEWER:
            return queryset.filter(
                state__in=(
                    ClaimState.QA_REVIEW,
                    ClaimState.RESUBMIT,
                    ClaimState.QA_APPROVED,
                    ClaimState.QA_REJECTED,
                )
            )
        return queryset


class WarrantyClaimRetrieveUpdateAPIView(generics.RetrieveUpdateAPIView):
    queryset = WarrantyClaim.objects.select_related(
        "registration",
        "paint_pair__topcoat",
        "paint_pair__basecoat",
        "paint_pair__registration",
        "approved_by",
    ).prefetch_related(
        "images__image",
        latest_quality_review_prefetch(with_required_items=True),
        latest_resubmission_prefetch(),
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
        "paint_pair__registration",
        "approved_by",
    ).prefetch_related(
        "images__image",
        latest_quality_review_prefetch(with_required_items=True),
        latest_resubmission_prefetch(),
    )
    detail_serializer_class = WarrantyClaimDetailSerializer

    def _build_response(self, claim: WarrantyClaim) -> Response:
        claim = self.get_queryset().get(pk=claim.pk)
        serializer = self.detail_serializer_class(claim, context=self.get_serializer_context())
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        claim = self.get_object()
        serializer = self.get_serializer(data=request.data, context={**self.get_serializer_context(), "claim": claim})
        serializer.is_valid(raise_exception=True)
        claim = serializer.save()
        return self._build_response(claim)


class ClaimQualityApproveAPIView(ClaimActionAPIView):
    serializer_class = ClaimQualityApproveSerializer
    permission_classes = [IsAuthenticated, IsQualityReviewerOrAdmin]


class ClaimQualityRejectAPIView(ClaimActionAPIView):
    serializer_class = ClaimQualityRejectSerializer
    permission_classes = [IsAuthenticated, IsQualityReviewerOrAdmin]


class ClaimQualityRequestInfoAPIView(ClaimActionAPIView):
    serializer_class = ClaimQualityRequestInfoSerializer
    permission_classes = [IsAuthenticated, IsQualityReviewerOrAdmin]


class ClaimCSRResubmissionAPIView(ClaimActionAPIView):
    serializer_class = ClaimCSRResubmissionCreateSerializer
    permission_classes = [IsAuthenticated, IsCSAgentOrAdmin]

    def get(self, request, *args, **kwargs):
        claim = self.get_object()
        payload = ClaimResubmissionRequestSerializer.build_from_claim(claim)
        serializer = ClaimResubmissionRequestSerializer(payload)
        return Response(serializer.data, status=status.HTTP_200_OK)
