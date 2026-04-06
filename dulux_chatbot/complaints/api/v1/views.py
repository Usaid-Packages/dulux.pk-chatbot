from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from dulux_chatbot.complaints.api.v1.serializers import (
    ChatMessageCreateSerializer,
    ChatMessageSerializer,
    ComplaintCreateSerializer,
    ComplaintDetailSerializer,
    ComplaintListSerializer,
    ComplaintUpdateSerializer,
)
from dulux_chatbot.complaints.models import ChatMessage, Complaint


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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save()

        payload = ChatMessageSerializer(message).data
        async_to_sync(get_channel_layer().group_send)(
            f"complaint_{self.kwargs['complaint_id']}",
            {
                "type": "chat.message",
                "message": payload,
            },
        )

        return Response(payload, status=status.HTTP_201_CREATED)
