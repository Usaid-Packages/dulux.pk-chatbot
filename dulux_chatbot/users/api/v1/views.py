from datetime import timedelta

from django.core.cache import cache
from django.db.models import Count, QuerySet
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from dulux_chatbot.complaints.choices import ComplaintStatus
from dulux_chatbot.complaints.models import Complaint
from dulux_chatbot.products.models import Product, SurfaceType
from dulux_chatbot.users.api.v1.serializers import DashboardAnalyticsQuerySerializer, DashboardCardsQuerySerializer
from dulux_chatbot.users.choices import UserRole
from dulux_chatbot.warranty.choices import ClaimState, RegistrationChannel, RegistrationState
from dulux_chatbot.warranty.models import WarrantyClaim, WarrantyRegistration


class IsDashboardUser(permissions.BasePermission):
    allowed_roles = {UserRole.CS_AGENT, UserRole.QUALITY_REVIEWER, UserRole.ADMIN}

    # TODO(audit F-7 Suggestion): Combined with IsAuthenticated in permission_classes,
    # user.is_authenticated is guaranteed True. getattr defensive checks are dead
    # code. Simplify to: return user.role in self.allowed_roles
    def has_permission(self, request, _view) -> bool:
        return request.user.role in self.allowed_roles


class DashboardBaseAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsDashboardUser]
    cache_timeout_seconds = 60

    def _cache_key(self, prefix: str, validated_data: dict) -> str:
        serialized_params = "|".join(f"{key}={validated_data.get(key)}" for key in sorted(validated_data))
        return f"dashboard:{prefix}:{serialized_params}"

    def _filter_registrations(self, validated_data: dict) -> QuerySet[WarrantyRegistration]:
        queryset = WarrantyRegistration.objects.all()
        if validated_data.get("date_from"):
            queryset = queryset.filter(created__date__gte=validated_data["date_from"])
        if validated_data.get("date_to"):
            queryset = queryset.filter(created__date__lte=validated_data["date_to"])
        return queryset

    def _filter_claims(self, validated_data: dict) -> QuerySet[WarrantyClaim]:
        queryset = WarrantyClaim.objects.all()
        if validated_data.get("date_from"):
            queryset = queryset.filter(created__date__gte=validated_data["date_from"])
        if validated_data.get("date_to"):
            queryset = queryset.filter(created__date__lte=validated_data["date_to"])
        return queryset

    def _filter_complaints(self, validated_data: dict) -> QuerySet[Complaint]:
        queryset = Complaint.objects.all()
        if validated_data.get("date_from"):
            queryset = queryset.filter(created__date__gte=validated_data["date_from"])
        if validated_data.get("date_to"):
            queryset = queryset.filter(created__date__lte=validated_data["date_to"])
        return queryset


class DashboardCardsAPIView(DashboardBaseAPIView):
    REGISTRATION_APPROVAL_SCREENS = 4
    MANUAL_REGISTRATION_SCREENS = 6
    CLAIMS_APPROVAL_SCREENS = 5
    QUALITY_REVIEW_SCREENS = 5
    LIVE_CHAT_SCREENS = 6
    PRODUCT_CATALOG_SCREENS = 5

    def get(self, request) -> Response:
        query_serializer = DashboardCardsQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)

        validated_data = query_serializer.validated_data
        cache_key = self._cache_key("cards", validated_data)
        cached_response = cache.get(cache_key)
        if cached_response is not None:
            return Response(cached_response)

        today = timezone.localdate()
        registration_queryset = self._filter_registrations(validated_data)
        claim_queryset = self._filter_claims(validated_data)
        complaint_queryset = self._filter_complaints(validated_data)

        payload = {
            "flows": {
                "registrationApprovals": {
                    "screens": self.REGISTRATION_APPROVAL_SCREENS,
                    "primaryStat": {
                        "label": "Pending",
                        "value": registration_queryset.filter(
                            state__in=(RegistrationState.SUBMITTED, RegistrationState.RESUBMIT)
                        ).count(),
                    },
                    # TODO(audit F-6 Important): Secondary stats query
                    # WarrantyRegistration.objects directly, bypassing the
                    # date-filtered registration_queryset. When a CS agent
                    # filters "last 7 days", these stats still show all-time
                    # counts — a logic bug. Use registration_queryset.filter(...)
                    # instead. Same issue on all secondary stats below.
                    "secondaryStat": {
                        "label": "Approved Today",
                        "value": registration_queryset.filter(
                            state=RegistrationState.APPROVED,
                            approved_at__date=today,
                        ).count(),
                    },
                },
                "manualRegistration": {
                    "screens": self.MANUAL_REGISTRATION_SCREENS,
                    "primaryStat": {
                        "label": "Drafts",
                        "value": registration_queryset.filter(
                            channel=RegistrationChannel.WEBFORM,
                            state=RegistrationState.IN_PROGRESS,
                        ).count(),
                    },
                    "secondaryStat": {
                        "label": "Submitted Today",
                        "value": registration_queryset.filter(
                            channel=RegistrationChannel.WEBFORM,
                            created__date=today,
                        ).count(),
                    },
                },
                "claimsApprovals": {
                    "screens": self.CLAIMS_APPROVAL_SCREENS,
                    "primaryStat": {
                        "label": "Pending CS Review",
                        "value": claim_queryset.filter(state__in=(ClaimState.SUBMITTED, ClaimState.RESUBMIT)).count(),
                    },
                    "secondaryStat": {
                        "label": "Forwarded",
                        "value": claim_queryset.filter(state=ClaimState.QA_REVIEW).count(),
                    },
                },
                "qualityReview": {
                    "screens": self.QUALITY_REVIEW_SCREENS,
                    "primaryStat": {
                        "label": "Awaiting Review",
                        "value": claim_queryset.filter(state=ClaimState.QA_REVIEW).count(),
                    },
                    "secondaryStat": {
                        "label": "Resolved Today",
                        "value": claim_queryset.filter(
                            state__in=(ClaimState.APPROVED, ClaimState.REJECTED),
                            modified__date=today,
                        ).count(),
                    },
                },
                "liveChat": {
                    "screens": self.LIVE_CHAT_SCREENS,
                    "primaryStat": {
                        "label": "Unassigned",
                        "value": complaint_queryset.filter(
                            status=ComplaintStatus.OPEN,
                            assigned_to__isnull=True,
                        ).count(),
                    },
                    "secondaryStat": {
                        "label": "Active",
                        "value": complaint_queryset.filter(status=ComplaintStatus.IN_PROGRESS).count(),
                    },
                },
                "productCatalog": {
                    "screens": self.PRODUCT_CATALOG_SCREENS,
                    "primaryStat": {"label": "Products", "value": Product.objects.count()},
                    "secondaryStat": {"label": "Surface Types", "value": SurfaceType.objects.count()},
                },
            }
        }

        cache.set(cache_key, payload, timeout=self.cache_timeout_seconds)
        return Response(payload)


class DashboardAnalyticsAPIView(DashboardBaseAPIView):
    def get(self, request) -> Response:
        query_serializer = DashboardAnalyticsQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)

        validated_data = query_serializer.validated_data
        cache_key = self._cache_key("analytics", validated_data)
        cached_response = cache.get(cache_key)
        if cached_response is not None:
            return Response(cached_response)

        window_days = validated_data["window_days"]
        today = timezone.localdate()
        start_date = today - timedelta(days=window_days - 1)
        day_range = [start_date + timedelta(days=offset) for offset in range(window_days)]

        registration_counts = self._daily_counts(
            WarrantyRegistration.objects.filter(created__date__gte=start_date, created__date__lte=today),
            "created",
        )
        claim_counts = self._daily_counts(
            WarrantyClaim.objects.filter(claim_date__gte=start_date, claim_date__lte=today),
            "claim_date",
        )

        payload = {
            "trendSeries": [
                {
                    "day": day.strftime("%a") if window_days == 7 else day.strftime("%d %b"),
                    "registrations": registration_counts.get(day, 0),
                    "claims": claim_counts.get(day, 0),
                }
                for day in day_range
            ],
            "workloadSeries": [
                {
                    "module": "Registrations",
                    "pending": WarrantyRegistration.objects.filter(
                        state__in=(RegistrationState.SUBMITTED, RegistrationState.RESUBMIT)
                    ).count(),
                    "inReview": WarrantyRegistration.objects.filter(state=RegistrationState.IN_PROGRESS).count(),
                    "resolved": WarrantyRegistration.objects.filter(
                        state__in=(RegistrationState.APPROVED, RegistrationState.REJECTED)
                    ).count(),
                },
                {
                    "module": "Claims",
                    "pending": WarrantyClaim.objects.filter(
                        state__in=(ClaimState.SUBMITTED, ClaimState.RESUBMIT)
                    ).count(),
                    "inReview": WarrantyClaim.objects.filter(state=ClaimState.IN_REVIEW).count(),
                    "resolved": WarrantyClaim.objects.filter(
                        state__in=(ClaimState.APPROVED, ClaimState.REJECTED)
                    ).count(),
                },
                {
                    "module": "Quality",
                    "pending": WarrantyClaim.objects.filter(state=ClaimState.QA_REVIEW).count(),
                    "inReview": 0,
                    "resolved": WarrantyClaim.objects.filter(
                        state__in=(ClaimState.APPROVED, ClaimState.REJECTED)
                    ).count(),
                },
                {
                    "module": "Complaints",
                    "pending": Complaint.objects.filter(status=ComplaintStatus.OPEN).count(),
                    "inReview": Complaint.objects.filter(status=ComplaintStatus.IN_PROGRESS).count(),
                    "resolved": Complaint.objects.filter(
                        status__in=(ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED)
                    ).count(),
                },
            ],
        }

        cache.set(cache_key, payload, timeout=self.cache_timeout_seconds)
        return Response(payload)

    def _daily_counts(self, queryset, date_field: str) -> dict:
        aggregated = queryset.annotate(day=TruncDate(date_field)).values("day").annotate(count=Count("id"))
        return {item["day"]: item["count"] for item in aggregated if item.get("day") is not None}
