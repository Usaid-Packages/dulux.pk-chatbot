from django.contrib.auth import get_user_model

from dulux_chatbot.complaints.choices import ComplaintStatus, MessageSender
from dulux_chatbot.complaints.models import ChatMessage, Complaint, ComplaintImage
from dulux_chatbot.core.models import Image
from dulux_chatbot.users.choices import UserRole


User = get_user_model()


def create_user(*, email: str = "complaints@example.com", role: str = UserRole.CS_AGENT):
    return User.objects.create_user(email=email, password="test-password-123", role=role)


def create_image(*, image_name: str = "complaints/test.jpg") -> Image:
    return Image.objects.create(image=image_name)


def create_complaint(
    *,
    status: str = ComplaintStatus.OPEN,
    registration=None,
    assigned_to=None,
    phone_number: str = "923001234567",
) -> Complaint:
    return Complaint.objects.create(
        registration=registration,
        phone_number=phone_number,
        customer_name="Complaint Customer",
        subject="Damaged paint",
        description="Description",
        status=status,
        assigned_to=assigned_to,
    )


def create_chat_message(
    *, complaint: Complaint, sender: str = MessageSender.CS_AGENT, text: str = "Hello"
) -> ChatMessage:
    return ChatMessage.objects.create(complaint=complaint, sender=sender, text=text)


def create_complaint_image(*, complaint: Complaint) -> ComplaintImage:
    return ComplaintImage.objects.create(complaint=complaint, image=create_image())
