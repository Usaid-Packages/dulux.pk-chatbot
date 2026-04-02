import random
import string


def generate_registration_code() -> str:
    from dulux_chatbot.warranty.models import WarrantyRegistration

    while True:
        code = "".join(random.choices(string.digits, k=6))
        if not WarrantyRegistration.objects.filter(registration_code=code).exists():
            return code
