from datetime import date

from constance import config
from rest_framework import serializers

from dulux_chatbot.core.validators import validate_pakistan_phone_number


def validate_registration_purchase_date(value: date) -> date:
    if value > date.today():
        raise serializers.ValidationError("Purchase date cannot be in the future.")
    if (date.today() - value).days > config.REGISTRATION_PURCHASE_DAYS_LIMIT:
        raise serializers.ValidationError("Purchase date is outside the allowed registration window.")
    return value


def validate_registration_phone_number(value: str) -> str:
    return validate_pakistan_phone_number(value)
