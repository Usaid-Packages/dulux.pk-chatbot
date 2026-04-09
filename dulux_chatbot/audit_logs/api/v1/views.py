from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from dulux_chatbot.audit_logs.api.v1.serializers import AuditLogDetailSerializer, AuditLogListSerializer
from dulux_chatbot.audit_logs.filters import AuditLogFilter
from dulux_chatbot.audit_logs.models import AuditLog
from dulux_chatbot.core.permissions import IsAdminUser


class AuditLogListAPIView(generics.ListAPIView):
    serializer_class = AuditLogListSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filterset_class = AuditLogFilter
    search_fields = ("actor_email", "object_repr", "model_label", "object_id")
    ordering_fields = ("created", "id", "action", "model_label", "object_id", "actor_email")
    ordering = ("-created", "-id")
    queryset = AuditLog.objects.select_related("actor", "content_type").order_by("-created", "-id")


class AuditLogDetailAPIView(generics.RetrieveAPIView):
    serializer_class = AuditLogDetailSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = AuditLog.objects.select_related("actor", "content_type").order_by("-created", "-id")
