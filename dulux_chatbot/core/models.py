from django.db import models
from django_extensions.db.models import TimeStampedModel


class Image(TimeStampedModel):
    image = models.ImageField(upload_to="images/%Y/%m/")

    def __str__(self) -> str:
        return str(self.image)
