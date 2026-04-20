import random
import string

from dulux_chatbot.warranty.constants import REGISTRATION_CODE_LENGTH


# TODO(audit SEC-09 Low): random.choices uses Python's Mersenne Twister PRNG which is
# predictable. Registration codes are 10-digit numeric strings. An attacker who observes
# a few codes could predict future ones. Use secrets.choice() for cryptographically
# secure generation if codes serve as any form of authentication/lookup token.
def generate_registration_code() -> str:
    from dulux_chatbot.warranty.models import WarrantyRegistration

    while True:
        code = "".join(random.choices(string.digits, k=REGISTRATION_CODE_LENGTH))
        if not WarrantyRegistration.objects.filter(registration_code=code).exists():
            return code
