from django.db import models


class RegistrationState(models.TextChoices):
    SUBMITTED = "SUBMITTED", "Registration Submitted"
    IN_PROGRESS = "IN_PROGRESS", "Registration In Progress"
    APPROVED = "APPROVED", "Registration Approved"
    REJECTED = "REJECTED", "Registration Rejected"
    RESUBMIT = "RESUBMIT", "Registration Resubmit"


class RegistrationChannel(models.TextChoices):
    WHATSAPP = "WHATSAPP", "WhatsApp"
    WEB = "WEB", "Web"
    WEBFORM = "WEBFORM", "Webform"


class ClaimState(models.TextChoices):
    SUBMITTED = "SUBMITTED", "Claim Submitted"
    IN_REVIEW = "IN_REVIEW", "Claim In Review"
    QA_REVIEW = "QA_REVIEW", "Claim Qa Review"
    APPROVED = "APPROVED", "Claim Approved"
    REJECTED = "REJECTED", "Claim Rejected"
    RESUBMIT = "RESUBMIT", "Claim Resubmit"


class IssueType(models.TextChoices):
    PEELING_CRACKING = "PEELING_CRACKING", "Peeling Or Cracking"
    COLOR_FADING = "COLOR_FADING", "Color Fading Or Flawed Color"
    ALGAE_FUNGUS = "ALGAE_FUNGUS", "Algae And Fungus Growth"
    WATER_INGRESS = "WATER_INGRESS", "Water Ingress"
    COVERAGE_VARIANCE = "COVERAGE_VARIANCE", "Coverage Variance"
    NON_UNIFORM_FINISH = "NON_UNIFORM_FINISH", "Non-uniform Or Patchy Finish"
    OTHERS = "OTHERS", "Others"


class InvoiceType(models.TextChoices):
    TOPCOAT = "TOPCOAT", "Topcoat Invoice"
    BASECOAT = "BASECOAT", "Basecoat Invoice"


class PhotoType(models.TextChoices):
    LONG_SHOT = "LONG_SHOT", "Long Shot"
    CLOSE_SHOT = "CLOSE_SHOT", "Close Shot"
    ALTERNATE_ANGLE = "ALTERNATE_ANGLE", "Alternate Angle"
