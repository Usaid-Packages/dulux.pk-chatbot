from django.db import models


class ProductType(models.TextChoices):
    TOPCOAT = "TOPCOAT", "Topcoat"
    BASECOAT = "BASECOAT", "Basecoat"


class Environment(models.TextChoices):
    INTERIOR = "INTERIOR", "Interior"
    EXTERIOR = "EXTERIOR", "Exterior"
