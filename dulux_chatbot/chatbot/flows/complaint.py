from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

from dulux_chatbot.chatbot.flows.base import BaseFlow
from dulux_chatbot.complaints.choices import MessageSender
from dulux_chatbot.complaints.models import ChatMessage, Complaint, ComplaintImage
from dulux_chatbot.warranty.models import WarrantyRegistration


class ComplaintFlow(BaseFlow):
    initial_step = "subject"

    def prompt_subject(self) -> None:
        self._send_step_prompt("Please share the complaint subject.")

    def prompt_description(self) -> None:
        self._send_step_prompt("Please describe the complaint.")

    def prompt_image_upload(self) -> None:
        self._send_step_prompt("Upload an image or reply DONE to finish.")

    def prompt_chat(self) -> None:
        self._send_step_prompt("Please send a text message for the complaint chat.")

    def handle_subject(self, message: dict) -> None:
        subject = self._get_text(message)
        if not subject:
            self.prompt_subject()
            return
        self._save_data("subject", subject)
        self.prompt_description()
        self._advance_to("description")

    def handle_description(self, message: dict) -> None:
        description = self._get_text(message)
        if not description:
            self.prompt_description()
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
            self.client.send_text(self.session.phone_number, "Please upload an image or reply DONE.")
            return
        images = list((self.session.session_data or {}).get("image_ids", []))
        if len(images) >= 3:
            self.handle_complete(message)
            return
        image = self._save_media_image(media_id, filename_prefix="complaint")
        images.append(image.id)
        self._save_data("image_ids", images)
        self._send_step_prompt("Image saved. Upload another image or reply DONE.")

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
        self._save_data("complaint_id", complaint.id)
        self.client.send_text(
            self.session.phone_number, f"Complaint created successfully. Complaint id: {complaint.id}."
        )
        self._advance_to("chat")

    def handle_chat(self, message: dict) -> None:
        complaint_id = (self.session.session_data or {}).get("complaint_id")
        text = self._get_text(message)
        if not complaint_id or not text:
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
                    "created": chat_message.created.isoformat(),
                },
            },
        )
        self.client.send_text(self.session.phone_number, "Your message has been shared with the support team.")
