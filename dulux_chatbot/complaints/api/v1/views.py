from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Count, Q
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
from dulux_chatbot.complaints.choices import ComplaintStatus, MessageSender
from dulux_chatbot.complaints.models import ChatMessage, Complaint, ComplaintImage
from dulux_chatbot.complaints.realtime import broadcast_complaint_created
from dulux_chatbot.core.permissions import IsCSAgentOrAdmin


class LiveChatCardCountsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCSAgentOrAdmin]

    def _validation_error_response(self, serializer) -> Response:
        message = next(iter(serializer.errors.values()))[0]
        return Response({"detail": str(message)}, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request, *args, **kwargs):
        serializer = CardCountQuerySerializer(data=request.query_params)
        if not serializer.is_valid():
            return self._validation_error_response(serializer)

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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint = serializer.save()
        broadcast_complaint_created(complaint=complaint)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        complaint_id = self.kwargs["complaint_id"]
        return ChatMessage.objects.filter(complaint_id=complaint_id).order_by("created")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ChatMessageCreateSerializer
        return ChatMessageSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["complaint"] = Complaint.objects.get(pk=self.kwargs["complaint_id"])
        return context

    def list(self, request, *args, **kwargs):
        complaint_id = self.kwargs["complaint_id"]
        messages = [
            {
                "id": message.id,
                "type": "MESSAGE",
                "sender": message.sender,
                "text": message.text,
                "image": None,
                "created": message.created,
            }
            for message in ChatMessage.objects.filter(complaint_id=complaint_id).order_by("created", "id")
        ]
        images = [
            {
                "id": complaint_image.id,
                "type": "IMAGE",
                "sender": MessageSender.CUSTOMER,
                "text": "",
                "image": complaint_image.image,
                "created": complaint_image.created,
            }
            for complaint_image in ComplaintImage.objects.select_related("image").filter(complaint_id=complaint_id)
        ]
        items = sorted([*messages, *images], key=lambda item: (item["created"], item["id"]))
        serializer = ComplaintChatItemSerializer(items, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        complaint = serializer.context["complaint"]

        payload = ChatMessageSerializer(message).data
        async_to_sync(get_channel_layer().group_send)(
            f"complaint_{self.kwargs['complaint_id']}",
            {
                "type": "chat.message",
                "message": payload,
            },
        )

        try:
            WhatsAppClient().send_text(complaint.phone_number, message.text)
        except WhatsAppAPIError:
            return Response(
                {
                    "detail": "Message saved but could not be sent to WhatsApp.",
                    "message": payload,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        activate_complaint_chat_session(phone_number=complaint.phone_number, complaint_id=complaint.id)
        return Response(payload, status=status.HTTP_201_CREATED)
