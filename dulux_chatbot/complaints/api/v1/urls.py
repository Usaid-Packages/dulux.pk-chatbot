from django.urls import path

from dulux_chatbot.complaints.api.v1.views import (
    ComplaintListCreateAPIView,
    ComplaintMessageListCreateAPIView,
    ComplaintRetrieveUpdateAPIView,
    LiveChatCardCountsAPIView,
)


urlpatterns = [
    path("card-counts/live-chat/", LiveChatCardCountsAPIView.as_view(), name="live_chat_card_counts"),
    path("", ComplaintListCreateAPIView.as_view(), name="complaint_list_create"),
    path("<int:pk>/", ComplaintRetrieveUpdateAPIView.as_view(), name="complaint_detail"),
    path(
        "<int:complaint_id>/messages/",
        ComplaintMessageListCreateAPIView.as_view(),
        name="complaint_message_list_create",
    ),
]
