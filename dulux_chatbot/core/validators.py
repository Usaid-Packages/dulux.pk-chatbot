import re

from rest_framework import serializers


PAKISTAN_PHONE_NUMBER_PATTERN = re.compile(r"^92\d{10}$")


def normalize_pakistan_phone_number(value: str) -> str:
    phone_number = re.sub(r"\D+", "", str(value or "").strip())
    if phone_number.startswith("00"):
        phone_number = phone_number[2:]
    if phone_number.startswith("0"):
        phone_number = f"92{phone_number[1:]}"
    return phone_number


def validate_pakistan_phone_number(value: str) -> str:
    phone_number = normalize_pakistan_phone_number(value)
    if not PAKISTAN_PHONE_NUMBER_PATTERN.fullmatch(phone_number):
        raise serializers.ValidationError("Phone number must start with 92 and include 10 digits after it.")
    return phone_number
