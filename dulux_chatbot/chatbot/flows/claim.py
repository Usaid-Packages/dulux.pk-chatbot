from django.db import transaction

from dulux_chatbot.chatbot.flows.base import BaseFlow
from dulux_chatbot.warranty.choices import IssueType, PhotoType, RegistrationState
from dulux_chatbot.warranty.models import ClaimImage, RegistrationPaintPair, WarrantyClaim, WarrantyRegistration


class ClaimFlow(BaseFlow):
    initial_step = "registration_lookup"

    def prompt_registration_lookup(self) -> None:
        self._send_step_prompt("Please share the registration code for the claim.")

    def prompt_paint_pair_select(self) -> None:
        self._send_step_prompt("Please share the topcoat product name for the claim.")

    def prompt_issue_type(self) -> None:
        self._send_step_prompt("Please share the issue type.")

    def prompt_affected_area(self) -> None:
        self._send_step_prompt("Please share the affected area in square feet.")

    def prompt_photo_long_shot(self) -> None:
        self._send_step_prompt("Please upload the long shot image.")

    def prompt_photo_close_shot(self) -> None:
        self._send_step_prompt("Please upload the close shot image.")

    def prompt_photo_alternate_angle(self) -> None:
        self._send_step_prompt("Please upload the alternate angle image.")

    def handle_registration_lookup(self, message: dict) -> None:
        code = self._get_text(message)
        registration = WarrantyRegistration.objects.filter(registration_code=code).first()
        if registration is None or registration.state != RegistrationState.APPROVED:
            self.client.send_text(self.session.phone_number, "Approved registration not found.")
            return
        self._save_data("registration_id", registration.id)
        self.prompt_paint_pair_select()
        self._advance_to("paint_pair_select")

    def handle_paint_pair_select(self, message: dict) -> None:
        product_name = self._get_text(message)
        registration_id = (self.session.session_data or {}).get("registration_id")
        if not product_name:
            self.client.send_text(self.session.phone_number, "Please share a valid topcoat product name.")
            return
        paint_pair = (
            RegistrationPaintPair.objects.select_related("topcoat")
            .filter(
                registration_id=registration_id,
                topcoat__name__iexact=product_name,
            )
            .first()
        )
        if paint_pair is None:
            self.client.send_text(self.session.phone_number, "Topcoat product not found for the selected registration.")
            return
        self._save_data("paint_pair_id", paint_pair.id)
        self.prompt_issue_type()
        self._advance_to("issue_type")

    def handle_issue_type(self, message: dict) -> None:
        issue_type = self._get_text(message).upper()
        if issue_type not in IssueType.values:
            self.client.send_text(self.session.phone_number, "Please share a valid issue type.")
            return
        self._save_data("issue_type", issue_type)
        self.prompt_affected_area()
        self._advance_to("affected_area")

    def handle_affected_area(self, message: dict) -> None:
        affected_area = self._get_text(message)
        try:
            if float(affected_area) <= 0:
                raise ValueError
        except ValueError:
            self.client.send_text(self.session.phone_number, "Please share a valid positive area.")
            return
        self._save_data("affected_area_sqft", affected_area)
        self.prompt_photo_long_shot()
        self._advance_to("photo_long_shot")

    def handle_photo_long_shot(self, message: dict) -> None:
        self._handle_photo_step(
            message,
            step="photo_close_shot",
            photo_type=PhotoType.LONG_SHOT,
            prompt="Please upload the close shot image.",
        )

    def handle_photo_close_shot(self, message: dict) -> None:
        self._handle_photo_step(
            message,
            step="photo_alternate_angle",
            photo_type=PhotoType.CLOSE_SHOT,
            prompt="Please upload the alternate angle image.",
        )

    def handle_photo_alternate_angle(self, message: dict) -> None:
        media_id = self._get_media_id(message)
        if not media_id:
            self.client.send_text(self.session.phone_number, "Please upload an image.")
            return
        image = self._save_media_image(media_id, filename_prefix="claim")
        self._append_data("images", {"image_id": image.id, "photo_type": PhotoType.ALTERNATE_ANGLE})
        self.handle_complete(message)

    def _handle_photo_step(self, message: dict, *, step: str, photo_type: str, prompt: str) -> None:
        media_id = self._get_media_id(message)
        if not media_id:
            self.client.send_text(self.session.phone_number, "Please upload an image.")
            return
        image = self._save_media_image(media_id, filename_prefix="claim")
        self._append_data("images", {"image_id": image.id, "photo_type": photo_type})
        self._send_step_prompt(prompt)
        self._advance_to(step)

    @transaction.atomic
    def handle_complete(self, _message: dict) -> None:
        data = self.session.session_data or {}
        claim = WarrantyClaim.objects.create(
            registration_id=data.get("registration_id"),
            paint_pair_id=data.get("paint_pair_id"),
            issue_type=data.get("issue_type", ""),
            affected_area_sqft=data.get("affected_area_sqft", "0"),
            notes="",
        )
        for image_data in data.get("images", []):
            ClaimImage.objects.create(claim=claim, image_id=image_data["image_id"], photo_type=image_data["photo_type"])
        self.client.send_text(self.session.phone_number, f"Claim submitted successfully. Claim id: {claim.id}.")
        self._reset()
