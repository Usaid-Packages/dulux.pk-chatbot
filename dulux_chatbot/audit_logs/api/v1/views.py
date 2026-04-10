from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from dulux_chatbot.audit_logs.api.v1.serializers import (
    AuditLogDetailSerializer,
    AuditLogListSerializer,
    AuditLogTimelineItemSerializer,
    AuditLogTimelineQuerySerializer,
)
from dulux_chatbot.audit_logs.filters import AuditLogFilter
from dulux_chatbot.audit_logs.models import AuditLog
from dulux_chatbot.core.permissions import IsAdminUser
from dulux_chatbot.warranty.models import ClaimQualityReview


class AuditLogListAPIView(generics.ListAPIView):
    serializer_class = AuditLogListSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filterset_class = AuditLogFilter
    search_fields = ("actor_email", "object_repr", "model_label", "object_id", "event_label")
    ordering_fields = ("created", "id", "action", "model_label", "object_id", "actor_email")
    ordering = ("-created", "-id")
    queryset = AuditLog.objects.select_related("actor", "content_type").order_by("-created", "-id")


class AuditLogDetailAPIView(generics.RetrieveAPIView):
    serializer_class = AuditLogDetailSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = AuditLog.objects.select_related("actor", "content_type").order_by("-created", "-id")


class AuditLogTimelineAPIView(generics.GenericAPIView):
    serializer_class = AuditLogTimelineQuerySerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    TYPE_TO_MODEL_LABEL = {
        "registration": "warranty.WarrantyRegistration",
        "claim": "warranty.WarrantyClaim",
        "complaint": "complaints.Complaint",
    }

    def get_queryset(self):
        serializer = self.get_serializer(data=self.request.query_params)
        serializer.is_valid(raise_exception=True)
        timeline_type = serializer.validated_data["type"]
        object_id = serializer.validated_data["object_id"]

        queryset = AuditLog.objects.select_related("actor", "content_type")
        if timeline_type == "quality":
            quality_review_ids = list(
                ClaimQualityReview.objects.filter(claim_id=object_id).values_list("id", flat=True)
            )
            queryset = queryset.filter(
                model_label="warranty.ClaimQualityReview",
                object_id__in=[str(review_id) for review_id in quality_review_ids],
            )
        else:
            queryset = queryset.filter(
                model_label=self.TYPE_TO_MODEL_LABEL[timeline_type],
                object_id=str(object_id),
            )
        return queryset.order_by("created", "id")

    def get(self, request, *args, **kwargs):
        timeline_data = AuditLogTimelineItemSerializer(self.get_queryset(), many=True).data
        return Response({"results": timeline_data})
