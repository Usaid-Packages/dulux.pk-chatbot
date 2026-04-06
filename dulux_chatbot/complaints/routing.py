from django.urls import path

from dulux_chatbot.complaints.consumers import ComplaintChatConsumer


websocket_urlpatterns = [
    path("ws/complaints/<int:complaint_id>/chat/", ComplaintChatConsumer.as_asgi(), name="complaint_chat"),
]
