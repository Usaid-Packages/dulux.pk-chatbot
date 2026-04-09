from django.db import transaction

from dulux_chatbot.chatbot.flows.base import BaseFlow
from dulux_chatbot.chatbot.models import WhatsAppSession
from dulux_chatbot.warranty.choices import ClaimResubmissionSource, ClaimState, QualityRequiredItem
from dulux_chatbot.warranty.models import (
    ClaimResubmission,
    ClaimResubmissionEntry,
    WarrantyClaim,
)


class ClaimResubmissionFlow(BaseFlow):
    initial_step = "claim_resubmission_item"
    IMAGE_REQUIRED_ITEMS = {
        QualityRequiredItem.ADDITIONAL_PHOTOS_DIFFERENT_ANGLES,
        QualityRequiredItem.CLOSE_UP_DAMAGE_PHOTOS,
        QualityRequiredItem.PROOF_OF_PURCHASE_INVOICE,
        QualityRequiredItem.PRODUCT_BATCH_NUMBER_PHOTO,
    }

    def prompt_claim_resubmission_item(self) -> None:
        session_data = self.session.session_data or {}
        pending_items = list(session_data.get("claim_resubmission_items", []))
        item_index = int(session_data.get("claim_resubmission_item_index", 0))
        if item_index >= len(pending_items):
            self._send_step_prompt(
                "If you want to add any extra context, reply with it now. Otherwise reply with SKIP."
            )
            self._advance_to("claim_resubmission_notes")
            return

        current_item = pending_items[item_index]
        item_label = self._quality_item_label(current_item)
        if current_item in self.IMAGE_REQUIRED_ITEMS:
            self._send_step_prompt(
                self._with_image_upload_note(
                    f"Please upload image evidence for: {item_label}. Reply with DONE when you have finished uploading."
                )
            )
            return

        self._send_step_prompt(f"Please share the requested details for: {item_label}.")

    def handle_claim_resubmission_item(self, message: dict) -> None:
        session_data = self.session.session_data or {}
        pending_items = list(session_data.get("claim_resubmission_items", []))
        item_index = int(session_data.get("claim_resubmission_item_index", 0))
        if item_index >= len(pending_items):
            self.prompt_claim_resubmission_item()
            return

        current_item = pending_items[item_index]
        if current_item in self.IMAGE_REQUIRED_ITEMS:
            self._handle_image_item(message=message, current_item=current_item)
            return

        response_text = self._get_text(message)
        if not response_text:
            self._send_validation_error("Please share the requested details as text.")
            return

        self._append_data(
            "claim_resubmission_entries",
            {"required_item": current_item, "response_text": response_text},
        )
        self._advance_item_index()

    def handle_claim_resubmission_notes(self, message: dict) -> None:
        notes = self._get_text(message)
        if notes.upper() != "SKIP" and notes:
            self._save_data("claim_resubmission_notes", notes)
        self.handle_complete(message)

    def _handle_image_item(self, *, message: dict, current_item: str) -> None:
        command = self._get_text(message).upper()
        if command == "DONE":
            current_images = list((self.session.session_data or {}).get("claim_resubmission_current_images", []))
            if not current_images:
                self._send_validation_error("Please upload at least one image before replying with DONE.")
                return
            for image_id in current_images:
                self._append_data(
                    "claim_resubmission_entries",
                    {"required_item": current_item, "image_id": image_id},
                )
            self._save_data("claim_resubmission_current_images", [])
            self._advance_item_index()
            return

        media_id = self._get_media_id(message)
        if not media_id:
            self._send_validation_error("Please upload an image or reply with DONE once finished.")
            return
        if str(message.get("type") or "").strip() != "image":
            self._send_validation_error("File format not supported. Please upload an image.")
            return

        image = self._save_media_image(media_id, filename_prefix="claim_resubmit")
        self._append_data("claim_resubmission_current_images", image.id)
        self._send_step_prompt(self._with_image_upload_note("Image received. Upload another image or reply with DONE."))

    def _advance_item_index(self) -> None:
        session_data = self.session.session_data or {}
        item_index = int(session_data.get("claim_resubmission_item_index", 0))
        session_data["claim_resubmission_item_index"] = item_index + 1
        self.session.session_data = session_data
        self.session.save(update_fields=["session_data", "modified"])
        self.prompt_claim_resubmission_item()

    @transaction.atomic
    def handle_complete(self, _message: dict) -> None:
        locked_session = WhatsAppSession.objects.select_for_update().get(pk=self.session.pk)
        data = locked_session.session_data or {}
        claim_id = data.get("claim_resubmission_claim_id")
        if not claim_id:
            self._send_error("Claim resubmission session is missing claim details.")
            self._reset()
            return

        claim = WarrantyClaim.objects.select_for_update().filter(pk=claim_id).first()
        if claim is None or claim.state != ClaimState.RESUBMIT:
            self._send_error("This claim can no longer accept resubmission details.")
            self._reset()
            return

        if data.get("claim_resubmission_completed"):
            return

        resubmission = ClaimResubmission.objects.create(
            claim=claim,
            source=ClaimResubmissionSource.WHATSAPP,
            notes=str(data.get("claim_resubmission_notes") or "").strip(),
        )
        for entry in data.get("claim_resubmission_entries", []):
            ClaimResubmissionEntry.objects.create(resubmission=resubmission, **entry)

        claim.state = ClaimState.QA_REVIEW
        if resubmission.notes:
            claim.notes = resubmission.notes
            claim.save(update_fields=["state", "notes", "modified"])
        else:
            claim.save(update_fields=["state", "modified"])

        data["claim_resubmission_completed"] = True
        locked_session.flow = None
        locked_session.current_step = "menu"
        locked_session.session_data = {}
        locked_session.save(update_fields=["flow", "current_step", "session_data", "modified"])
        self.session.flow = None
        self.session.current_step = "menu"
        self.session.session_data = {}
        self.client.send_text(
            self.session.phone_number,
            "Thank you. Your additional claim details have been received and sent back to the Quality team.",
        )

    def _quality_item_label(self, required_item: str) -> str:
        try:
            return QualityRequiredItem(required_item).label
        except ValueError:
            return required_item.replace("_", " ").title()
