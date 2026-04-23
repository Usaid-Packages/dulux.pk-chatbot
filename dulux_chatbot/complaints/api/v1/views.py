from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils.functional import cached_property
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from dulux_chatbot.chatbot.services.sessions import activate_complaint_chat_session
from dulux_chatbot.chatbot.services.whatsapp_client import WhatsAppAPIError, WhatsAppClient
from dulux_chatbot.complaints.api.v1.serializers import (
    CardCountQuerySerializer,
    ChatMessageCreateSerializer,
    ChatMessageSerializer,
    ComplaintChatItemSerializer,
    ComplaintCreateSerializer,
    ComplaintDetailSerializer,
    ComplaintListSerializer,
    ComplaintUpdateSerializer,
)
from dulux_chatbot.complaints.choices import ComplaintStatus
from dulux_chatbot.complaints.models import ChatMessage, Complaint
from dulux_chatbot.complaints.utils.helpers import build_complaint_chat_items
from dulux_chatbot.complaints.utils.realtime import broadcast_complaint_created
from dulux_chatbot.core.permissions import IsCSAgentOrAdmin


class LiveChatCardCountsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCSAgentOrAdmin]

    def get(self, request, *args, **kwargs):
        serializer = CardCountQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data
        queryset = Complaint.objects.all()
        if validated_data.get("date_from"):
            queryset = queryset.filter(created__date__gte=validated_data["date_from"])
        if validated_data.get("date_to"):
            queryset = queryset.filter(created__date__lte=validated_data["date_to"])
        if validated_data.get("agent_id"):
            queryset = queryset.filter(assigned_to_id=validated_data["agent_id"])

        counts = queryset.aggregate(
            open=Count("id", filter=Q(status=ComplaintStatus.OPEN)),
            in_progress=Count("id", filter=Q(status=ComplaintStatus.IN_PROGRESS)),
            closed=Count("id", filter=Q(status__in=(ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED))),
        )
        return Response({key: int(value or 0) for key, value in counts.items()}, status=status.HTTP_200_OK)


class ComplaintListCreateAPIView(generics.ListCreateAPIView):
    queryset = (
        Complaint.objects.select_related("registration", "assigned_to")
        .prefetch_related("images__image")
        .order_by("-created")
    )
    filterset_fields = ["status"]
    search_fields = ["phone_number", "customer_name", "subject"]
    ordering_fields = ["created"]
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ComplaintCreateSerializer
        return ComplaintListSerializer

    def perform_create(self, serializer):
        complaint = serializer.save()
        broadcast_complaint_created(complaint=complaint)


class ComplaintRetrieveUpdateAPIView(generics.RetrieveUpdateAPIView):
    queryset = Complaint.objects.select_related("registration", "assigned_to").prefetch_related(
        "images__image",
        "messages",
    )
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return ComplaintUpdateSerializer
        return ComplaintDetailSerializer


class ComplaintMessageListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsCSAgentOrAdmin]

    @cached_property
    def complaint(self):
        return get_object_or_404(Complaint, pk=self.kwargs["complaint_id"])

    def get_queryset(self):
        return ChatMessage.objects.filter(complaint=self.complaint).order_by("created")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ChatMessageCreateSerializer
        return ChatMessageSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["complaint"] = self.complaint
        return context

    def list(self, request, *args, **kwargs):
        items = build_complaint_chat_items(complaint_id=self.complaint.id)
        serializer = ComplaintChatItemSerializer(items, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint = serializer.context["complaint"]

        try:
            WhatsAppClient().send_text(complaint.phone_number, serializer.validated_data["text"])
        except WhatsAppAPIError:
            return Response(
                {"detail": "Message could not be sent to WhatsApp."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        message = serializer.save()
        payload = ChatMessageSerializer(message).data
        async_to_sync(get_channel_layer().group_send)(
            f"complaint_{self.kwargs['complaint_id']}",
            {
                "type": "chat.message",
                "message": payload,
            },
        )

        activate_complaint_chat_session(phone_number=complaint.phone_number, complaint_id=complaint.id)
        return Response(payload, status=status.HTTP_201_CREATED)
