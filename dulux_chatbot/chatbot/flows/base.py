import re

from abc import ABC

from django.core.files.base import ContentFile
from rest_framework import serializers

from dulux_chatbot.chatbot.constants import (
    CMD_GO_BACK,
    CMD_MAIN_MENU,
    CMD_MAIN_MENU_WORDS,
    MAX_WHATSAPP_MEDIA_BYTES,
    STEP_MENU,
)
from dulux_chatbot.chatbot.constants import IMAGE_UPLOAD_NOTE as DEFAULT_IMAGE_UPLOAD_NOTE
from dulux_chatbot.chatbot.constants import MAIN_MENU_TEXT as DEFAULT_MAIN_MENU_TEXT
from dulux_chatbot.core.models import Image


IMAGE_MIME_TYPE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class BaseFlow(ABC):
    initial_step = ""
    BACK_COMMAND = CMD_GO_BACK
    MAIN_MENU_COMMAND = CMD_MAIN_MENU
    TEXT_BACK_COMMANDS = {"BACK"}
    TEXT_MAIN_MENU_COMMANDS = CMD_MAIN_MENU_WORDS
    IMAGE_UPLOAD_NOTE = DEFAULT_IMAGE_UPLOAD_NOTE
    MAIN_MENU_TEXT = DEFAULT_MAIN_MENU_TEXT

    def __init__(self, session, client):
        self.session = session
        self.client = client

    def handle(self, message: dict) -> None:
        step = self.session.current_step or STEP_MENU
        command = self._get_text(message)
        if command.upper() in self.TEXT_BACK_COMMANDS:
            self._go_back()
            return
        if command.upper() in self.TEXT_MAIN_MENU_COMMANDS:
            self._go_main_menu()
            return
        if command == self.BACK_COMMAND:
            self._go_back()
            return
        if command == self.MAIN_MENU_COMMAND:
            self._go_main_menu()
            return

        handler = getattr(self, f"handle_{step}", None)
        if handler is None:
            self._send_error("Something went wrong. Returning to the main menu.")
            self._reset()
            return
        handler(message)

    def _advance_to(self, step: str) -> None:
        session_data = self.session.session_data or {}
        history = list(session_data.get("_history", []))
        current_step = self.session.current_step or STEP_MENU
        if current_step and current_step != step:
            history.append(current_step)
        session_data["_history"] = history
        self.session.session_data = session_data
        self.session.current_step = step
        self.session.save(update_fields=["session_data", "current_step", "modified"])

    def _save_data(self, key: str, value) -> None:
        session_data = self.session.session_data or {}
        session_data[key] = value
        self.session.session_data = session_data
        self.session.save(update_fields=["session_data", "modified"])

    def _append_data(self, key: str, value) -> None:
        session_data = self.session.session_data or {}
        items = list(session_data.get(key, []))
        items.append(value)
        session_data[key] = items
        self.session.session_data = session_data
        self.session.save(update_fields=["session_data", "modified"])

    def _reset(self) -> None:
        self.session.flow = None
        self.session.current_step = STEP_MENU
        self.session.session_data = {}
        self.session.save(
            update_fields=[
                "flow",
                "current_step",
                "session_data",
                "modified",
            ]
        )

    def _send_error(self, text: str) -> None:
        self.client.send_text(self.session.phone_number, text)

    def _send_step_prompt(self, text: str) -> None:
        self.client.send_text(
            self.session.phone_number,
            f"{text}\n\n{self.BACK_COMMAND}. Go back\n{self.MAIN_MENU_COMMAND}. Main menu",
        )

    def _get_text(self, message: dict) -> str:
        return str(message.get("text") or message.get("interactive_id") or "").strip()

    def _get_media_id(self, message: dict) -> str:
        return str(message.get("media_id") or "").strip()

    def _message_type(self, message: dict) -> str:
        return str(message.get("type") or "").strip()

    def _is_supported_media_type(self, message: dict, *, expected_type: str = "image") -> bool:
        message_type = self._message_type(message)
        return not message_type or message_type == expected_type

    def _save_media_image(self, media_id: str, *, filename_prefix: str) -> Image:
        if hasattr(self.client, "download_media_with_metadata"):
            content, metadata = self.client.download_media_with_metadata(media_id)
        else:
            content = self.client.download_media(media_id)
            metadata = {}
        extension = self._get_media_file_extension(metadata.get("mime_type"))
        if len(content) > MAX_WHATSAPP_MEDIA_BYTES:
            raise serializers.ValidationError("Image size must be 50 MB or smaller.")
        return Image.objects.create(
            image=ContentFile(content, name=f"{filename_prefix}_{media_id}{extension}"),
        )

    def _get_media_file_extension(self, mime_type: str | None) -> str:
        normalized_mime_type = str(mime_type or "").lower().strip()
        extension = IMAGE_MIME_TYPE_EXTENSIONS.get(normalized_mime_type)
        if extension is None:
            raise serializers.ValidationError("Unsupported image type. Please upload a JPG, PNG, or WEBP image.")
        return extension

    def send_initial_prompt(self) -> None:
        self.send_prompt()

    def send_prompt(self) -> None:
        handler = getattr(self, f"prompt_{self.session.current_step}", None)
        if handler is not None:
            handler()

    def _go_back(self) -> None:
        session_data = self.session.session_data or {}
        history = list(session_data.get("_history", []))
        if not history:
            self._go_main_menu()
            return
        self.session.current_step = history.pop()
        session_data["_history"] = history
        self.session.session_data = session_data
        self.session.save(update_fields=["current_step", "session_data", "modified"])
        self.send_prompt()

    def _go_main_menu(self) -> None:
        self._reset()
        self._send_main_menu_message()

    def _send_main_menu_message(self) -> None:
        self.client.send_text(self.session.phone_number, self.MAIN_MENU_TEXT)

    def _send_validation_error(self, text: str) -> None:
        self._send_step_prompt(text)

    def _with_image_upload_note(self, text: str) -> str:
        return f"{text}\n\n{self.IMAGE_UPLOAD_NOTE}"

    def _is_plain_text_value(self, value: str) -> bool:
        stripped = value.strip()
        if not stripped:
            return False
        return any(character.isalpha() for character in stripped)

    def _is_not_all_digits(self, value: str) -> bool:
        normalized = re.sub(r"\s+", "", value)
        return bool(normalized) and not normalized.isdigit()

    def _normalize_numeric_input(self, value: str) -> str:
        match = re.search(r"-?\d+(?:\.\d+)?", value)
        return match.group(0) if match else ""

    def _normalize_pakistan_phone_number(self, value: str) -> str:
        normalized = re.sub(r"\D+", "", value)
        if normalized.startswith("00"):
            normalized = normalized[2:]
        if normalized.startswith("0"):
            normalized = f"92{normalized[1:]}"
        if len(normalized) == 12 and normalized.startswith("92") and normalized[2] == "3":
            return normalized
        return ""

    def _set_choice_options(self, key: str, options: list[tuple[str, int]]) -> None:
        session_data = self.session.session_data or {}
        session_data[key] = {option: object_id for option, object_id in options}
        self.session.session_data = session_data
        self.session.save(update_fields=["session_data", "modified"])

    def _get_choice_value(self, key: str, selected_option: str):
        session_data = self.session.session_data or {}
        options = session_data.get(key, {})
        return options.get(selected_option)

    def _build_choice_lines(self, items, *, start_index: int = 1) -> list[tuple[str, int, str]]:
        return [(str(index), item.id, item.name) for index, item in enumerate(items, start=start_index)]
