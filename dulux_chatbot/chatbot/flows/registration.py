from datetime import datetime

from constance import config
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction

from dulux_chatbot.chatbot.flows.base import BaseFlow
from dulux_chatbot.products.choices import ProductType
from dulux_chatbot.products.models import Product
from dulux_chatbot.warranty.api.v1.serializers import WarrantyRegistrationCreateSerializer


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

    def prompt_topcoat_select(self) -> None:
        self._send_step_prompt("Please share topcoat product name.")

    def prompt_topcoat_quantity(self) -> None:
        self._send_step_prompt("Please share topcoat quantity in liters.")

    def prompt_basecoat_select(self) -> None:
        self._send_step_prompt("Please share basecoat product name or SKIP.")

    def prompt_basecoat_quantity(self) -> None:
        self._send_step_prompt("Please share basecoat quantity in liters.")

    def prompt_add_more_pairs(self) -> None:
        self._send_step_prompt("Add another paint pair? Reply YES or NO.")

    def prompt_invoice_upload(self) -> None:
        self._send_step_prompt(
            "Please upload at least one invoice image. After uploading all invoice images, reply DONE."
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
            self.client.send_text(self.session.phone_number, "Name is required.")
            return
        self._save_data("customer_name", name)
        self.prompt_email()
        self._advance_to("email")

    def handle_email(self, message: dict) -> None:
        email = self._get_text(message)
        try:
            validate_email(email)
        except ValidationError:
            self.client.send_text(self.session.phone_number, "Please provide a valid email address.")
            return
        self._save_data("email", email)
        self.prompt_city()
        self._advance_to("city")

    def handle_city(self, message: dict) -> None:
        self._save_data("city", self._get_text(message))
        self.prompt_province()
        self._advance_to("province")

    def handle_province(self, message: dict) -> None:
        self._save_data("province", self._get_text(message))
        self.prompt_site_address()
        self._advance_to("site_address")

    def handle_site_address(self, message: dict) -> None:
        self._save_data("site_address", self._get_text(message))
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
            self.client.send_text(self.session.phone_number, "Invalid date format.")
            return
        if parsed_date > datetime.utcnow().date():
            self.client.send_text(self.session.phone_number, "Purchase date cannot be in the future.")
            return
        if (datetime.utcnow().date() - parsed_date).days > config.REGISTRATION_PURCHASE_DAYS_LIMIT:
            self.client.send_text(
                self.session.phone_number, "Purchase date is outside the allowed registration window."
            )
            return
        self._save_data("purchase_date", parsed_date.isoformat())
        self.prompt_dealer_name()
        self._advance_to("dealer_name")

    def handle_dealer_name(self, message: dict) -> None:
        self._save_data("purchase_dealer", self._get_text(message))
        self.prompt_dealer_city()
        self._advance_to("dealer_city")

    def handle_dealer_city(self, message: dict) -> None:
        self._save_data("purchase_dealer_city", self._get_text(message))
        self.prompt_dealer_address()
        self._advance_to("dealer_address")

    def handle_dealer_address(self, message: dict) -> None:
        self._save_data("purchase_dealer_address", self._get_text(message))
        self.prompt_topcoat_select()
        self._advance_to("topcoat_select")

    def handle_topcoat_select(self, message: dict) -> None:
        product = self._get_product(message, product_type=ProductType.TOPCOAT)
        if product is None:
            self.client.send_text(self.session.phone_number, "Please share a valid active TOPCOAT product name.")
            return
        self._save_data("current_topcoat_id", product.id)
        self.prompt_topcoat_quantity()
        self._advance_to("topcoat_quantity")

    def handle_topcoat_quantity(self, message: dict) -> None:
        quantity = self._get_text(message)
        if not quantity:
            self.client.send_text(self.session.phone_number, "Topcoat quantity in liters is required.")
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
        product = self._get_product(message, product_type=ProductType.BASECOAT)
        if product is None:
            self.client.send_text(
                self.session.phone_number, "Please share a valid active BASECOAT product name or SKIP."
            )
            return
        self._save_data("current_basecoat_id", product.id)
        self.prompt_basecoat_quantity()
        self._advance_to("basecoat_quantity")

    def handle_basecoat_quantity(self, message: dict) -> None:
        quantity = self._get_text(message)
        if not quantity:
            self.client.send_text(self.session.phone_number, "Basecoat quantity in liters is required.")
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
            self.prompt_invoice_upload()
            self._advance_to("invoice_upload")
            return
        self.client.send_text(self.session.phone_number, "Reply YES or NO.")

    def handle_invoice_upload(self, message: dict) -> None:
        text = self._get_text(message).upper()
        media_id = self._get_media_id(message)
        message_type = str(message.get("type") or "").strip()
        if text == "DONE":
            if not (self.session.session_data or {}).get("paint_pair_invoices"):
                self.client.send_text(
                    self.session.phone_number, "At least one invoice image is required before submission."
                )
                return
            self.handle_complete(message)
            return
        if media_id and message_type and message_type != "image":
            self.client.send_text(self.session.phone_number, "Please upload an image file for the invoice.")
            return
        if not media_id:
            self.client.send_text(
                self.session.phone_number,
                "Please upload an invoice image or reply DONE after uploading all invoice images.",
            )
            return
        image = self._save_media_image(media_id, filename_prefix="registration_invoice")
        self._append_data("paint_pair_invoices", {"image_id": image.id, "invoice_type": "TOPCOAT"})
        self._send_step_prompt("Invoice saved. Upload another invoice image or reply DONE.")

    @transaction.atomic
    def handle_complete(self, _message: dict) -> None:
        data = self.session.session_data or {}
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
                "paint_pairs": paint_pairs,
                "paint_pair_invoices": data.get("paint_pair_invoices", []),
            }
        )
        serializer.is_valid(raise_exception=True)
        registration = serializer.save()

        self.client.send_text(
            self.session.phone_number,
            f"Registration submitted successfully. Your registration code is {registration.registration_code}.",
        )
        self._reset()

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

    def _get_product(self, message: dict, *, product_type: str):
        value = self._get_text(message)
        if not value:
            return None
        return Product.objects.filter(name__iexact=value, product_type=product_type, is_active=True).first()
