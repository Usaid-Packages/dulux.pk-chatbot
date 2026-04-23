from django.db import models


class ComplaintStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    RESOLVED = "RESOLVED", "Resolved"
    CLOSED = "CLOSED", "Closed"


class ComplaintSubject(models.TextChoices):
    PRODUCT_COMPLAINT = "PRODUCT_COMPLAINT", "Product Complaint"
    DEALER_COMPLAINT = "DEALER_COMPLAINT", "Dealer Complaint"
    SALES_TEAM_COMPLAINT = "SALES_TEAM_COMPLAINT", "Sales Team Complaint"
    BARCODES_ISSUE = "BARCODES_ISSUE", "Barcodes Issue"
    TDS_AND_SDS_DETAILS = "TDS_AND_SDS_DETAILS", "TDS & SDS Details"
    PAINTER_POINTS = "PAINTER_POINTS", "Painter Points"
    OTHER = "OTHER", "Other"


class MessageSender(models.TextChoices):
    CUSTOMER = "CUSTOMER", "Customer"
    CS_AGENT = "CS_AGENT", "CS Agent"
