from typing import ClassVar

from django.contrib.auth.models import AbstractUser
from django.db import models

from dulux_chatbot.users.choices import UserRole
from dulux_chatbot.users.fields import EmailField
from dulux_chatbot.users.managers import UserManager


class User(AbstractUser):
    email = EmailField(unique=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
    )

    username = None
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: ClassVar[list[str]] = []

    objects = UserManager()

    def __str__(self) -> str:
        return self.email
