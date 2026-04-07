import re

from rest_framework import serializers


PAKISTAN_PHONE_NUMBER_PATTERN = re.compile(r"^92\d{10}$")


def validate_pakistan_phone_number(value: str) -> str:
    phone_number = str(value or "").strip()
    if not PAKISTAN_PHONE_NUMBER_PATTERN.fullmatch(phone_number):
        raise serializers.ValidationError("Phone number must start with 92 and include 10 digits after it.")
    return phone_number
