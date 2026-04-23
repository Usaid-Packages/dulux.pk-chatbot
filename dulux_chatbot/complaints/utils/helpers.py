from dulux_chatbot.complaints.choices import MessageSender
from dulux_chatbot.complaints.constants import COMPLAINT_CHAT_ITEM_TYPE_IMAGE, COMPLAINT_CHAT_ITEM_TYPE_MESSAGE
from dulux_chatbot.complaints.models import ChatMessage, ComplaintImage


def build_complaint_chat_items(*, complaint_id: int):
    messages = [
        {
            "id": message.id,
            "type": COMPLAINT_CHAT_ITEM_TYPE_MESSAGE,
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
            "type": COMPLAINT_CHAT_ITEM_TYPE_IMAGE,
            "sender": MessageSender.CUSTOMER,
            "text": "",
            "image": complaint_image.image,
            "created": complaint_image.created,
        }
        for complaint_image in ComplaintImage.objects.select_related("image").filter(complaint_id=complaint_id)
    ]
    return sorted([*messages, *images], key=lambda item: (item["created"], item["id"]))
