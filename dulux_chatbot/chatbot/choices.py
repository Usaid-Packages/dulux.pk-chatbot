from django.db import models


class FlowType(models.TextChoices):
    REGISTRATION = "REGISTRATION", "Warranty Registration"
    CLAIM = "CLAIM", "Warranty Claim"
    FIND_PRODUCT = "FIND_PRODUCT", "Find a Product"
    COMPLAINT = "COMPLAINT", "Raise a Complaint"
    REISSUANCE = "REISSUANCE", "Certificate Reissuance"
