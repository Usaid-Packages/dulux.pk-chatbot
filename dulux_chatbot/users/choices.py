from django.db import models


class UserRole(models.TextChoices):
    CS_AGENT = "CS_AGENT", "CS Agent"
    QUALITY_REVIEWER = "QUALITY_REVIEWER", "Quality Reviewer"
    ADMIN = "ADMIN", "Admin"
