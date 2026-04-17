from django.contrib.auth import get_user_model
from django.db import models
from django_extensions.db.models import TimeStampedModel

from dulux_chatbot.complaints.choices import ComplaintStatus, MessageSender


User = get_user_model()


class Complaint(TimeStampedModel):
    registration = models.ForeignKey(
        "warranty.WarrantyRegistration",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="complaints",
    )
    # TODO(audit F-4 Important): phone_number and status lack db_index despite
    # being used in dashboard card-count aggregates, list filters, and search_fields.
    # Add db_index=True to both — same issue already flagged on warranty models.
    phone_number = models.CharField(max_length=20)
    customer_name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=ComplaintStatus.choices, default=ComplaintStatus.OPEN)
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_complaints",
    )
    closed_at = models.DateTimeField(null=True, blank=True)
    closure_note = models.CharField(max_length=500, blank=True)

    def __str__(self) -> str:
        return f"{self.phone_number} - {self.subject}"


class ChatMessage(TimeStampedModel):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="messages")
    sender = models.CharField(max_length=20, choices=MessageSender.choices)
    text = models.TextField()

    def __str__(self) -> str:
        return f"{self.complaint_id} - {self.sender}"


class ComplaintImage(TimeStampedModel):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="images")
    image = models.ForeignKey("core.Image", on_delete=models.PROTECT, related_name="complaint_images")

    def __str__(self) -> str:
        return f"{self.complaint_id} - {self.image_id}"
