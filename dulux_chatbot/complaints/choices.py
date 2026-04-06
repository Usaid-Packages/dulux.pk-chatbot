from django.db import models


class ComplaintStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    RESOLVED = "RESOLVED", "Resolved"
    CLOSED = "CLOSED", "Closed"


class MessageSender(models.TextChoices):
    CUSTOMER = "CUSTOMER", "Customer"
    CS_AGENT = "CS_AGENT", "CS Agent"
