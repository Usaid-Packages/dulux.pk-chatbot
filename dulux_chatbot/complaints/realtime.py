from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from dulux_chatbot.complaints.models import Complaint


def broadcast_complaint_created(*, complaint: Complaint) -> None:
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    from dulux_chatbot.complaints.api.v1.serializers import ComplaintListSerializer

    payload = ComplaintListSerializer(complaint).data
    async_to_sync(channel_layer.group_send)(
        "complaints",
        {
            "type": "complaint.created",
            "complaint": payload,
        },
    )
