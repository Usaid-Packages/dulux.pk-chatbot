from django.urls import path

from dulux_chatbot.complaints.api.v1.views import (
    ComplaintListCreateAPIView,
    ComplaintMessageListCreateAPIView,
    ComplaintRetrieveUpdateAPIView,
)


urlpatterns = [
    path("", ComplaintListCreateAPIView.as_view(), name="complaint_list_create"),
    path("<int:pk>/", ComplaintRetrieveUpdateAPIView.as_view(), name="complaint_detail"),
    path(
        "<int:complaint_id>/messages/",
        ComplaintMessageListCreateAPIView.as_view(),
        name="complaint_message_list_create",
    ),
]
