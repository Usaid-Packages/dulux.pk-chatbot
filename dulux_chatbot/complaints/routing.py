from django.urls import path

from dulux_chatbot.complaints.consumers import ComplaintChatConsumer, ComplaintQueueConsumer


websocket_urlpatterns = [
    path("ws/complaints/queue/", ComplaintQueueConsumer.as_asgi(), name="complaint_queue"),
    path("ws/complaints/<int:complaint_id>/chat/", ComplaintChatConsumer.as_asgi(), name="complaint_chat"),
]
