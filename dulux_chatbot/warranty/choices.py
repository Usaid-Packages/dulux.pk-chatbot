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
    QA_APPROVED = "QA_APPROVED", "Claim Qa Approved"
    QA_REJECTED = "QA_REJECTED", "Claim Qa Rejected"
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


class QualityTechnicalReason(models.TextChoices):
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE", "Insufficient Evidence"
    APPLICATION_ERROR = "APPLICATION_ERROR", "Application Error"
    SURFACE_PREPARATION_ISSUE = "SURFACE_PREPARATION_ISSUE", "Surface Preparation Issue"
    WRONG_PRODUCT_USAGE = "WRONG_PRODUCT_USAGE", "Wrong Product Usage"
    ENVIRONMENTAL_FACTOR = "ENVIRONMENTAL_FACTOR", "Environmental Factor"
    OUT_OF_SCOPE_WARRANTY = "OUT_OF_SCOPE_WARRANTY", "Out Of Scope Warranty"
    SUSPECTED_TAMPERING = "SUSPECTED_TAMPERING", "Suspected Tampering"
    DUPLICATE_OR_INVALID_CLAIM = "DUPLICATE_OR_INVALID_CLAIM", "Duplicate Or Invalid Claim"
    OTHER = "OTHER", "Other"


class QualityRequiredItem(models.TextChoices):
    ADDITIONAL_PHOTOS_DIFFERENT_ANGLES = (
        "ADDITIONAL_PHOTOS_DIFFERENT_ANGLES",
        "Additional Photos Different Angles",
    )
    CLOSE_UP_DAMAGE_PHOTOS = "CLOSE_UP_DAMAGE_PHOTOS", "Close Up Damage Photos"
    PROOF_OF_PURCHASE_INVOICE = "PROOF_OF_PURCHASE_INVOICE", "Proof Of Purchase Invoice"
    PRODUCT_BATCH_NUMBER_PHOTO = "PRODUCT_BATCH_NUMBER_PHOTO", "Product Batch Number Photo"
    APPLICATION_DETAILS_METHOD_COATS_PREP = (
        "APPLICATION_DETAILS_METHOD_COATS_PREP",
        "Application Details Method Coats Prep",
    )
    ISSUE_TIMELINE_DETAILS = "ISSUE_TIMELINE_DETAILS", "Issue Timeline Details"
    SITE_CONDITIONS_INFO = "SITE_CONDITIONS_INFO", "Site Conditions Info"
    OTHER = "OTHER", "Other"


class QualityDecisionType(models.TextChoices):
    REQUEST_INFO = "REQUEST_INFO", "Request Info"
    QA_APPROVED = "QA_APPROVED", "Qa Approved"
    QA_REJECTED = "QA_REJECTED", "Qa Rejected"


class ClaimResubmissionSource(models.TextChoices):
    WHATSAPP = "WHATSAPP", "WhatsApp"
    COMPLAINT = "COMPLAINT", "Complaint"
