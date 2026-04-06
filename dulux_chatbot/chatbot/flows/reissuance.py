from dulux_chatbot.chatbot.flows.base import BaseFlow
from dulux_chatbot.warranty.models import WarrantyRegistration
from dulux_chatbot.warranty.tasks import generate_and_send_certificate


class ReissuanceFlow(BaseFlow):
    initial_step = "phone_lookup"

    def prompt_phone_lookup(self) -> None:
        self._send_step_prompt("Please share the phone number used in the registration.")

    def handle_phone_lookup(self, message: dict) -> None:
        phone_number = self._get_text(message)
        registration = WarrantyRegistration.objects.filter(phone_number=phone_number).order_by("-created").first()
        if registration is None:
            self.client.send_text(self.session.phone_number, "No registration found for this phone number.")
            return
        self._save_data("registration_id", registration.id)
        self.handle_complete(message)

    def handle_complete(self, _message: dict) -> None:
        registration_id = (self.session.session_data or {}).get("registration_id")
        registration = WarrantyRegistration.objects.filter(pk=registration_id).first()
        if registration is None:
            self.client.send_text(self.session.phone_number, "Registration not found.")
            self._reset()
            return
        if registration.warranty_certificate:
            self.client.send_document(
                self.session.phone_number,
                registration.warranty_certificate.url,
                "warranty_certificate.pdf",
                "Your warranty certificate",
            )
        else:
            generate_and_send_certificate.delay(registration.id)
            self.client.send_text(
                self.session.phone_number, "Your certificate is being regenerated and will be sent shortly."
            )
        self._reset()
