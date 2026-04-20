from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

from dulux_chatbot.chatbot.constants import STEP_CHAT
from dulux_chatbot.chatbot.flows.base import BaseFlow
from dulux_chatbot.complaints.choices import ComplaintSubject, MessageSender
from dulux_chatbot.complaints.models import ChatMessage, Complaint, ComplaintImage
from dulux_chatbot.complaints.realtime import broadcast_complaint_created
from dulux_chatbot.warranty.models import WarrantyRegistration


class ComplaintFlow(BaseFlow):
    initial_step = "subject"

    def prompt_subject(self) -> None:
        self._send_step_prompt(f"Please select the complaint subject.\n\n{self._build_subject_options_text()}")

    def prompt_description(self) -> None:
        self._send_step_prompt("Please describe the complaint.")

    def prompt_image_upload(self) -> None:
        self._send_step_prompt(self._with_image_upload_note("Upload an image or reply DONE to finish."))

    def prompt_chat(self) -> None:
        self._send_step_prompt(
            self._with_image_upload_note("Please send a text message or upload an image for the complaint chat.")
        )

    def handle_subject(self, message: dict) -> None:
        subject = self._resolve_subject(self._get_text(message))
        if not subject:
            self._send_validation_error(
                f"Please select a valid complaint subject.\n\n{self._build_subject_options_text()}"
            )
            return
        self._save_data("subject", subject)
        self.prompt_description()
        self._advance_to("description")

    def handle_description(self, message: dict) -> None:
        description = self._get_text(message)
        if not description:
            self._send_validation_error("Please describe the complaint.")
            return
        if not self._is_plain_text_value(description) or not self._is_not_all_digits(description):
            self._send_validation_error("Please provide a valid complaint description.")
            return
        self._save_data("description", description)
        self.prompt_image_upload()
        self._advance_to("image_upload")

    def handle_image_upload(self, message: dict) -> None:
        text = self._get_text(message).upper()
        if text == "DONE":
            self.handle_complete(message)
            return
        media_id = self._get_media_id(message)
        if not media_id:
            self._send_validation_error("Please upload an image or reply DONE.")
            return
        if not self._is_supported_media_type(message):
            self._send_validation_error("File format not supported. Please upload an image.")
            return
        images = list((self.session.session_data or {}).get("image_ids", []))
        if len(images) >= 3:
            self.handle_complete(message)
            return
        image = self._save_media_image(media_id, filename_prefix="complaint")
        images.append(image.id)
        self._save_data("image_ids", images)
        self._send_step_prompt(self._with_image_upload_note("Image saved. Upload another image or reply DONE."))

    @transaction.atomic
    def handle_complete(self, _message: dict) -> None:
        data = self.session.session_data or {}
        registration = (
            WarrantyRegistration.objects.filter(phone_number=self.session.phone_number).order_by("-created").first()
        )
        complaint = Complaint.objects.create(
            registration=registration,
            phone_number=self.session.phone_number,
            customer_name=data.get("customer_name") or self.session.phone_number,
            subject=data.get("subject", ""),
            description=data.get("description", ""),
        )
        for image_id in data.get("image_ids", []):
            ComplaintImage.objects.create(complaint=complaint, image_id=image_id)
        ChatMessage.objects.create(
            complaint=complaint,
            sender=MessageSender.CUSTOMER,
            text=data.get("description", ""),
        )
        broadcast_complaint_created(complaint=complaint)
        self._save_data("complaint_id", complaint.id)
        self.client.send_text(
            self.session.phone_number,
            (
                "Complaint created successfully. Customer Support Representative will contact you soon. "
                "Please wait for a minute or two. You can continue sending messages here and they will go directly "
                "to customer support. Write MAIN MENU if you want to return to the main menu."
            ),
        )
        self._advance_to(STEP_CHAT)

    def handle_chat(self, message: dict) -> None:
        complaint_id = (self.session.session_data or {}).get("complaint_id")
        text = self._get_text(message)
        media_id = self._get_media_id(message)
        if not complaint_id:
            self.prompt_chat()
            return
        if media_id:
            if not self._is_supported_media_type(message):
                self._send_validation_error("File format not supported. Please upload an image.")
                return
            image = self._save_media_image(media_id, filename_prefix="complaint_chat")
            complaint_image = ComplaintImage.objects.create(complaint_id=complaint_id, image=image)
            async_to_sync(get_channel_layer().group_send)(
                f"complaint_{complaint_id}",
                {
                    "type": "chat.message",
                    "message": {
                        "id": complaint_image.id,
                        "sender": MessageSender.CUSTOMER,
                        "image_id": image.id,
                        "image_url": image.image.url,
                        "message_type": "image",
                        "created": complaint_image.created.isoformat(),
                    },
                },
            )
            return
        if not text:
            self.prompt_chat()
            return
        chat_message = ChatMessage.objects.create(
            complaint_id=complaint_id,
            sender=MessageSender.CUSTOMER,
            text=text,
        )
        async_to_sync(get_channel_layer().group_send)(
            f"complaint_{complaint_id}",
            {
                "type": "chat.message",
                "message": {
                    "id": chat_message.id,
                    "sender": chat_message.sender,
                    "text": chat_message.text,
                    "message_type": "text",
                    "created": chat_message.created.isoformat(),
                },
            },
        )

    def _build_subject_options_text(self) -> str:
        return "\n".join(f"{index}. {label}" for index, (_value, label) in enumerate(ComplaintSubject.choices, start=1))

    def _resolve_subject(self, value: str) -> str:
        normalized_value = value.strip()
        if normalized_value.isdigit():
            index = int(normalized_value) - 1
            if 0 <= index < len(ComplaintSubject.choices):
                return ComplaintSubject.choices[index][0]

        normalized_lookup = normalized_value.upper().replace("&", "AND").replace(" ", "_")
        for subject_value, subject_label in ComplaintSubject.choices:
            normalized_label = subject_label.upper().replace("&", "AND").replace(" ", "_")
            if normalized_lookup in {subject_value, normalized_label}:
                return subject_value

        return ""
