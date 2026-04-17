from functools import partial

from dulux_chatbot.chatbot.flows.base import BaseFlow
from dulux_chatbot.chatbot.services.dispatch_side_effects import defer_dispatch_side_effect
from dulux_chatbot.chatbot.tasks import send_whatsapp_main_menu
from dulux_chatbot.warranty.choices import RegistrationState
from dulux_chatbot.warranty.models import WarrantyRegistration
from dulux_chatbot.warranty.services.certificate import generate_warranty_certificate


class ReissuanceFlow(BaseFlow):
    initial_step = "phone_lookup"

    def _has_pdf_certificate(self, registration: WarrantyRegistration) -> bool:
        certificate_name = getattr(registration.warranty_certificate, "name", "") or ""
        return certificate_name.lower().endswith(".pdf")

    def prompt_phone_lookup(self) -> None:
        self._send_step_prompt("Please share the phone number used in the registration.")

    def handle_phone_lookup(self, message: dict) -> None:
        phone_number = self._get_text(message)
        if not phone_number:
            self._send_validation_error("Please share the phone number used in the registration.")
            return
        normalized_phone_number = self._normalize_pakistan_phone_number(phone_number)
        if not normalized_phone_number:
            self._send_validation_error("Please provide a valid phone number in 92XXXXXXXXXX format.")
            return
        registrations = list(
            WarrantyRegistration.objects.filter(
                phone_number=normalized_phone_number,
                state=RegistrationState.APPROVED,
            ).order_by("-purchase_date", "-created")
        )
        if not registrations:
            self._send_validation_error("No registration found for this phone number.")
            return
        if len(registrations) == 1:
            self._save_data("registration_id", registrations[0].id)
            self.handle_complete(message)
            return

        options = [
            {
                "option": str(index),
                "registration_id": registration.id,
                "registration_code": registration.registration_code,
                "purchase_date": registration.purchase_date.strftime("%d/%m/%Y"),
            }
            for index, registration in enumerate(registrations, start=1)
        ]
        self._save_data("registration_options", options)
        self._advance_to("registration_select")
        self.send_prompt()

    def prompt_registration_select(self) -> None:
        options = (self.session.session_data or {}).get("registration_options", [])
        if not options:
            self._send_validation_error(
                "Registration options are unavailable. Please return to the main menu and try again."
            )
            return
        lines = [
            "We found multiple registrations for this phone number. Please select one:",
        ]
        lines.extend(
            f"{option['option']}. {option['registration_code']} - {option['purchase_date']}" for option in options
        )
        self._send_step_prompt("\n".join(lines))

    def handle_registration_select(self, message: dict) -> None:
        selection = self._get_text(message)
        options = (self.session.session_data or {}).get("registration_options", [])
        selected_option = next((option for option in options if option.get("option") == selection), None)
        if selected_option is None:
            self._send_validation_error("Please select a valid registration option.")
            return
        self._save_data("registration_id", selected_option["registration_id"])
        session_data = self.session.session_data or {}
        session_data.pop("registration_options", None)
        self.session.session_data = session_data
        self.session.save(update_fields=["session_data", "modified"])
        self.handle_complete(message)

    def handle_complete(self, _message: dict) -> None:
        registration_id = (self.session.session_data or {}).get("registration_id")
        registration = (
            WarrantyRegistration.objects.prefetch_related("paint_pairs__topcoat", "paint_pairs__basecoat")
            .filter(pk=registration_id)
            .first()
        )
        if registration is None:
            self._send_validation_error("Registration not found.")
            self._reset()
            return
        if registration.warranty_certificate and not self._has_pdf_certificate(registration):
            registration.warranty_certificate.delete(save=False)
            registration.warranty_certificate = None
            registration.save(update_fields=["warranty_certificate"])
        if not registration.warranty_certificate:
            content = generate_warranty_certificate(registration)
            registration.warranty_certificate.save(content.name, content, save=True)
        self.client.send_text(
            self.session.phone_number, "Please wait while we send your selected warranty certificate."
        )
        self.client.send_document(
            self.session.phone_number,
            registration.warranty_certificate.url,
            "warranty_certificate.pdf",
            "Your warranty certificate",
        )
        self._reset()
        defer_dispatch_side_effect(
            partial(
                send_whatsapp_main_menu.apply_async,
                args=[self.session.phone_number, self.MAIN_MENU_TEXT],
                countdown=2,
            )
        )
