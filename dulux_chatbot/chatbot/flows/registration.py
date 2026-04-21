from datetime import datetime
from decimal import Decimal, InvalidOperation

from constance import config
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction

from dulux_chatbot.chatbot.constants import MIN_EXCLUSIVE_WHATSAPP_WARRANTY_OPTION_YEARS
from dulux_chatbot.chatbot.flows.base import BaseFlow
from dulux_chatbot.products.choices import ProductType
from dulux_chatbot.products.models import Product
from dulux_chatbot.warranty.api.v1.serializers import (
    WarrantyRegistrationCreateSerializer,
    WarrantyRegistrationUpdateSerializer,
)
from dulux_chatbot.warranty.choices import RegistrationState
from dulux_chatbot.warranty.models import WarrantyRegistration
from dulux_chatbot.warranty.utils.resubmission import STEP_TO_MODEL_FIELD, is_registration_resubmit_session


class RegistrationFlow(BaseFlow):
    initial_step = "consent"

    def prompt_consent(self) -> None:
        self._send_step_prompt("Reply YES to continue or NO to cancel.")

    def prompt_name(self) -> None:
        self._send_step_prompt("Please share your full name.")

    def prompt_email(self) -> None:
        self._send_step_prompt("Please share your email address.")

    def prompt_city(self) -> None:
        self._send_step_prompt("Which city is the site located in?")

    def prompt_province(self) -> None:
        self._send_step_prompt("Please share the province.")

    def prompt_site_address(self) -> None:
        self._send_step_prompt("Please share the site address.")

    def prompt_purchase_date(self) -> None:
        self._send_step_prompt("Please share purchase date in DD/MM/YYYY or YYYY-MM-DD format.")

    def prompt_dealer_name(self) -> None:
        self._send_step_prompt("Please share dealer name.")

    def prompt_dealer_city(self) -> None:
        self._send_step_prompt("Please share dealer city.")

    def prompt_dealer_address(self) -> None:
        self._send_step_prompt("Please share dealer address.")

    def prompt_postal_code(self) -> None:
        if not is_registration_resubmit_session(self.session.session_data or {}):
            self.prompt_topcoat_select()
            self._advance_to("topcoat_select")
            return
        self._send_step_prompt("Please share postal code.")

    def prompt_topcoat_select(self) -> None:
        topcoats = list(
            Product.objects.filter(
                product_type=ProductType.TOPCOAT,
                is_active=True,
                warranty_years__gt=MIN_EXCLUSIVE_WHATSAPP_WARRANTY_OPTION_YEARS,
            ).order_by("name")
        )
        if not topcoats:
            self._send_validation_error("No active topcoat products are available right now.")
            return
        option_lines = self._build_choice_lines(topcoats)
        self._set_choice_options("topcoat_options", [(option, product_id) for option, product_id, _ in option_lines])
        prompt_lines = ["Please select a topcoat product:"]
        prompt_lines.extend(f"{option}. {label}" for option, _, label in option_lines)
        self._send_step_prompt("\n".join(prompt_lines))

    def prompt_topcoat_quantity(self) -> None:
        self._send_step_prompt("Please share topcoat quantity in liters.")

    def prompt_basecoat_select(self) -> None:
        current_topcoat_id = (self.session.session_data or {}).get("current_topcoat_id")
        linked_basecoats = list(
            Product.objects.filter(
                topcoat_mappings__topcoat_id=current_topcoat_id,
                is_active=True,
                warranty_years__gt=MIN_EXCLUSIVE_WHATSAPP_WARRANTY_OPTION_YEARS,
            ).order_by("name")
        )
        if not linked_basecoats:
            self._set_choice_options("basecoat_options", [])
            self._send_step_prompt("No linked basecoats are available for this topcoat. Reply SKIP.")
            return
        option_lines = self._build_choice_lines(linked_basecoats)
        self._set_choice_options("basecoat_options", [(option, product_id) for option, product_id, _ in option_lines])
        prompt_lines = ["Please select a basecoat product or reply SKIP:"]
        prompt_lines.extend(f"{option}. {label}" for option, _, label in option_lines)
        self._send_step_prompt("\n".join(prompt_lines))

    def prompt_basecoat_quantity(self) -> None:
        self._send_step_prompt("Please share basecoat quantity in liters.")

    def prompt_add_more_pairs(self) -> None:
        self._send_step_prompt("Add another paint pair? Reply YES or NO.")

    def prompt_invoice_upload(self) -> None:
        self._send_step_prompt(
            self._with_image_upload_note(
                "Please upload at least one invoice image. After uploading all invoice images, reply DONE."
            )
        )

    def handle_consent(self, message: dict) -> None:
        text = self._get_text(message).upper()
        if text in {"YES", "Y"}:
            self.prompt_name()
            self._advance_to("name")
            return
        if text in {"NO", "N"}:
            self.client.send_text(self.session.phone_number, "Registration cancelled.")
            self._go_main_menu()
            return
        self.prompt_consent()

    def handle_name(self, message: dict) -> None:
        name = self._get_text(message)
        if not name:
            self._send_validation_error("Name is required.")
            return
        if not self._is_plain_text_value(name) or not self._is_not_all_digits(name):
            self._send_validation_error("Please provide a valid name.")
            return
        self._save_data("customer_name", name)
        if self._advance_resubmit_after_current_step("name"):
            return
        self.prompt_email()
        self._advance_to("email")

    def handle_email(self, message: dict) -> None:
        email = self._get_text(message)
        try:
            validate_email(email)
        except ValidationError:
            self._send_validation_error("Please provide a valid email address.")
            return
        self._save_data("email", email)
        if self._advance_resubmit_after_current_step("email"):
            return
        self.prompt_city()
        self._advance_to("city")

    def handle_city(self, message: dict) -> None:
        city = self._get_text(message)
        if not city:
            self._send_validation_error("City is required.")
            return
        if not self._is_plain_text_value(city) or not self._is_not_all_digits(city):
            self._send_validation_error("Please provide a valid city.")
            return
        self._save_data("city", city)
        if self._advance_resubmit_after_current_step("city"):
            return
        self.prompt_site_address()
        self._advance_to("site_address")

    def handle_province(self, message: dict) -> None:
        province = self._get_text(message)
        if not province:
            self._send_validation_error("Province is required.")
            return
        if not self._is_plain_text_value(province) or not self._is_not_all_digits(province):
            self._send_validation_error("Please provide a valid province.")
            return
        self._save_data("province", province)
        if self._advance_resubmit_after_current_step("province"):
            return
        self.prompt_site_address()
        self._advance_to("site_address")

    def handle_site_address(self, message: dict) -> None:
        site_address = self._get_text(message)
        if not site_address:
            self._send_validation_error("Site address is required.")
            return
        if not self._is_plain_text_value(site_address) or not self._is_not_all_digits(site_address):
            self._send_validation_error("Please provide a valid site address.")
            return
        self._save_data("site_address", site_address)
        if self._advance_resubmit_after_current_step("site_address"):
            return
        self.prompt_purchase_date()
        self._advance_to("purchase_date")

    def handle_purchase_date(self, message: dict) -> None:
        raw_value = self._get_text(message)
        parsed_date = None
        for date_format in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d"):
            try:
                parsed_date = datetime.strptime(raw_value, date_format).date()
                break
            except ValueError:
                continue
        if parsed_date is None:
            self._send_validation_error("Invalid date format.")
            return
        if parsed_date > datetime.utcnow().date():
            self._send_validation_error("Purchase date cannot be in the future.")
            return
        if (datetime.utcnow().date() - parsed_date).days > config.REGISTRATION_PURCHASE_DAYS_LIMIT:
            self._send_validation_error("Purchase date is outside the allowed registration window.")
            return
        self._save_data("purchase_date", parsed_date.isoformat())
        if self._advance_resubmit_after_current_step("purchase_date"):
            return
        self.prompt_dealer_name()
        self._advance_to("dealer_name")

    def handle_dealer_name(self, message: dict) -> None:
        dealer_name = self._get_text(message)
        if not dealer_name:
            self._send_validation_error("Dealer name is required.")
            return
        if not self._is_plain_text_value(dealer_name) or not self._is_not_all_digits(dealer_name):
            self._send_validation_error("Please provide a valid dealer name.")
            return
        self._save_data("purchase_dealer", dealer_name)
        if self._advance_resubmit_after_current_step("dealer_name"):
            return
        self.prompt_dealer_city()
        self._advance_to("dealer_city")

    def handle_dealer_city(self, message: dict) -> None:
        dealer_city = self._get_text(message)
        if not dealer_city:
            self._send_validation_error("Dealer city is required.")
            return
        if not self._is_plain_text_value(dealer_city) or not self._is_not_all_digits(dealer_city):
            self._send_validation_error("Please provide a valid dealer city.")
            return
        self._save_data("purchase_dealer_city", dealer_city)
        if self._advance_resubmit_after_current_step("dealer_city"):
            return
        self.prompt_dealer_address()
        self._advance_to("dealer_address")

    def handle_dealer_address(self, message: dict) -> None:
        dealer_address = self._get_text(message)
        if not dealer_address:
            self._send_validation_error("Dealer address is required.")
            return
        if not self._is_plain_text_value(dealer_address) or not self._is_not_all_digits(dealer_address):
            self._send_validation_error("Please provide a valid dealer address.")
            return
        self._save_data("purchase_dealer_address", dealer_address)
        if self._advance_resubmit_after_current_step("dealer_address"):
            return
        self.prompt_topcoat_select()
        self._advance_to("topcoat_select")

    def handle_postal_code(self, message: dict) -> None:
        if not is_registration_resubmit_session(self.session.session_data or {}):
            self.prompt_topcoat_select()
            self._advance_to("topcoat_select")
            return
        postal_code = self._get_text(message)
        if not postal_code:
            self._send_validation_error("Postal code is required.")
            return
        if len(postal_code) > 20:
            self._send_validation_error("Please provide a postal code under 20 characters.")
            return
        self._save_data("postal_code", postal_code)
        if self._advance_resubmit_after_current_step("postal_code"):
            return
        self.prompt_topcoat_select()
        self._advance_to("topcoat_select")

    def handle_topcoat_select(self, message: dict) -> None:
        selected_option = self._get_text(message)
        product_id = self._get_choice_value("topcoat_options", selected_option)
        if product_id is None:
            self.prompt_topcoat_select()
            return
        self._save_data("current_topcoat_id", product_id)
        self.prompt_topcoat_quantity()
        self._advance_to("topcoat_quantity")

    def handle_topcoat_quantity(self, message: dict) -> None:
        quantity = self._parse_quantity(self._get_text(message))
        if quantity is None:
            self._send_validation_error("Please provide topcoat quantity in liters as a valid number.")
            return
        self._save_data("current_topcoat_quantity", quantity)
        self.prompt_basecoat_select()
        self._advance_to("basecoat_select")

    def handle_basecoat_select(self, message: dict) -> None:
        text = self._get_text(message).upper()
        if text == "SKIP":
            self._append_current_paint_pair()
            self.prompt_add_more_pairs()
            self._advance_to("add_more_pairs")
            return
        product_id = self._get_choice_value("basecoat_options", self._get_text(message))
        if product_id is None:
            self.prompt_basecoat_select()
            return
        self._save_data("current_basecoat_id", product_id)
        self.prompt_basecoat_quantity()
        self._advance_to("basecoat_quantity")

    def handle_basecoat_quantity(self, message: dict) -> None:
        quantity = self._parse_quantity(self._get_text(message))
        if quantity is None:
            self._send_validation_error("Please provide basecoat quantity in liters as a valid number.")
            return
        self._save_data("current_basecoat_quantity", quantity)
        self._append_current_paint_pair()
        self.prompt_add_more_pairs()
        self._advance_to("add_more_pairs")

    def handle_add_more_pairs(self, message: dict) -> None:
        text = self._get_text(message).upper()
        if text == "YES":
            self.prompt_topcoat_select()
            self._advance_to("topcoat_select")
            return
        if text == "NO":
            if self._advance_resubmit_after_current_step("topcoat_select"):
                return
            self.prompt_invoice_upload()
            self._advance_to("invoice_upload")
            return
        self._send_validation_error("Reply YES or NO.")

    def handle_invoice_upload(self, message: dict) -> None:
        text = self._get_text(message).upper()
        media_id = self._get_media_id(message)
        if text == "DONE":
            if not (self.session.session_data or {}).get("paint_pair_invoices"):
                self.client.send_text(
                    self.session.phone_number,
                    "At least one invoice image is required before submission.\n\n0. Go back\n00. Main menu",
                )
                return
            if self._advance_resubmit_after_current_step("invoice_upload"):
                return
            self.handle_complete(message)
            return
        if media_id and not self._is_supported_media_type(message):
            self._send_validation_error("File format not supported. Please upload an image file for the invoice.")
            return
        if not media_id:
            self._send_validation_error(
                "Please upload an invoice image or reply DONE after uploading all invoice images."
            )
            return
        image = self._save_media_image(media_id, filename_prefix="registration_invoice")
        self._append_data("paint_pair_invoices", {"image_id": image.id, "invoice_type": "TOPCOAT"})
        self._send_step_prompt(
            self._with_image_upload_note("Invoice saved. Upload another invoice image or reply DONE.")
        )

    @transaction.atomic
    def handle_complete(self, _message: dict) -> None:
        data = self.session.session_data or {}
        if is_registration_resubmit_session(data):
            self._handle_resubmit_complete(data)
            return
        serializer = WarrantyRegistrationCreateSerializer(
            data={
                "channel": "WHATSAPP",
                "customer_name": data.get("customer_name", ""),
                "phone_number": self.session.phone_number,
                "email": data.get("email", ""),
                "city": data.get("city", ""),
                "province": data.get("province", ""),
                "site_address": data.get("site_address", ""),
                "purchase_date": data.get("purchase_date"),
                "purchase_dealer": data.get("purchase_dealer", ""),
                "purchase_dealer_city": data.get("purchase_dealer_city", ""),
                "purchase_dealer_address": data.get("purchase_dealer_address", ""),
                "postal_code": "",
                "notes": "",
                "paint_pairs": self._build_paint_pairs_payload(data),
                "paint_pair_invoices": data.get("paint_pair_invoices", []),
            }
        )
        serializer.is_valid(raise_exception=True)
        registration = serializer.save()

        self.client.send_text(
            self.session.phone_number,
            (
                "Thank you for registering with Dulux Assurance Warranty Program. "
                "Our team is evaluating your submission and will get back to you within 14 working days. "
                "If you have any queries, contact us on our helpline 0800-DULUX(38589). "
                f"Registration number: {registration.registration_code}"
            ),
        )
        self._reset()
        self._send_main_menu_message()

    def _advance_resubmit_after_current_step(self, current_step: str) -> bool:
        session_data = self.session.session_data or {}
        if not is_registration_resubmit_session(session_data):
            return False
        resubmit_steps = list(session_data.get("resubmit_steps", []))
        step_index = int(session_data.get("resubmit_step_index", 0))
        if step_index >= len(resubmit_steps) or resubmit_steps[step_index] != current_step:
            return False
        next_index = step_index + 1
        session_data["resubmit_step_index"] = next_index
        self.session.session_data = session_data
        self.session.save(update_fields=["session_data", "modified"])
        if next_index >= len(resubmit_steps):
            self.handle_complete({})
            return True
        next_step = resubmit_steps[next_index]
        self.send_prompt_for_resubmit(next_step)
        self._advance_to(next_step)
        return True

    def send_prompt_for_resubmit(self, step: str) -> None:
        prompt_handler = getattr(self, f"prompt_{step}", None)
        if prompt_handler is not None:
            prompt_handler()

    def _handle_resubmit_complete(self, data: dict) -> None:
        registration = WarrantyRegistration.objects.prefetch_related("rejection_fields").get(
            pk=data["resubmit_registration_id"]
        )
        payload = {}
        for step in data.get("resubmit_steps", []):
            if step in STEP_TO_MODEL_FIELD:
                payload[STEP_TO_MODEL_FIELD[step]] = data.get(STEP_TO_MODEL_FIELD[step], "")
            elif step == "topcoat_select":
                payload["paint_pairs"] = self._build_paint_pairs_payload(data)
            elif step == "invoice_upload":
                payload["paint_pair_invoices"] = data.get("paint_pair_invoices", [])

        serializer = WarrantyRegistrationUpdateSerializer(
            instance=registration,
            data=payload,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        registration.state = RegistrationState.SUBMITTED
        registration.rejection_fields.all().delete()
        registration.save(update_fields=["state", "modified"])
        self.client.send_text(
            self.session.phone_number,
            "Your updated warranty registration details have been submitted successfully.",
        )
        self._reset()
        self._send_main_menu_message()

    def _build_paint_pairs_payload(self, data: dict) -> list[dict]:
        paint_pairs = []
        for pair_data in data.get("paint_pairs", []):
            paint_pair_payload = {
                "topcoat": pair_data.get("topcoat_id"),
                "topcoat_quantity": pair_data.get("topcoat_quantity"),
            }
            if pair_data.get("basecoat_id") is not None:
                paint_pair_payload["basecoat"] = pair_data.get("basecoat_id")
                paint_pair_payload["basecoat_quantity"] = pair_data.get("basecoat_quantity")
            paint_pairs.append(paint_pair_payload)
        return paint_pairs

    def _append_current_paint_pair(self) -> None:
        session_data = self.session.session_data or {}
        paint_pairs = list(session_data.get("paint_pairs", []))
        pair = {
            "topcoat_id": session_data.get("current_topcoat_id"),
            "topcoat_quantity": session_data.get("current_topcoat_quantity"),
        }
        if session_data.get("current_basecoat_id"):
            pair["basecoat_id"] = session_data.get("current_basecoat_id")
            pair["basecoat_quantity"] = session_data.get("current_basecoat_quantity")
        paint_pairs.append(pair)
        for key in (
            "current_topcoat_id",
            "current_topcoat_quantity",
            "current_basecoat_id",
            "current_basecoat_quantity",
        ):
            session_data.pop(key, None)
        session_data["paint_pairs"] = paint_pairs
        self.session.session_data = session_data
        self.session.save(update_fields=["session_data", "modified"])

    def _parse_quantity(self, value: str) -> str | None:
        if not value:
            return None
        try:
            quantity = Decimal(value)
        except (InvalidOperation, ValueError):
            return None
        if quantity <= 0:
            return None
        return str(quantity.normalize())
