import random
import string

from dulux_chatbot.warranty.constants import REGISTRATION_CODE_LENGTH


def generate_registration_code() -> str:
    from dulux_chatbot.warranty.models import WarrantyRegistration

    while True:
        code = "".join(random.choices(string.digits, k=REGISTRATION_CODE_LENGTH))
        if not WarrantyRegistration.objects.filter(registration_code=code).exists():
            return code
