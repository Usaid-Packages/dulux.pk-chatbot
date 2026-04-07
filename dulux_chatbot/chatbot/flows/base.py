import re

from abc import ABC

from django.core.files.base import ContentFile

from dulux_chatbot.core.models import Image


class BaseFlow(ABC):
    initial_step = ""
    BACK_COMMAND = "0"
    RESTART_COMMAND = "00"
    MAIN_MENU_COMMAND = "000"
    TEXT_BACK_COMMANDS = {"BACK"}
    TEXT_RESTART_COMMANDS = {"RESTART", "START OVER"}
    TEXT_MAIN_MENU_COMMANDS = {"MENU", "MAIN MENU"}

    def __init__(self, session, client):
        self.session = session
        self.client = client

    def handle(self, message: dict) -> None:
        step = self.session.current_step or "menu"
        command = self._get_text(message)
        if command.upper() in self.TEXT_BACK_COMMANDS:
            self._go_back()
            return
        if command.upper() in self.TEXT_RESTART_COMMANDS:
            self._start_over()
            return
        if command.upper() in self.TEXT_MAIN_MENU_COMMANDS:
            self._go_main_menu()
            return
        if command == self.BACK_COMMAND:
            self._go_back()
            return
        if command == self.RESTART_COMMAND:
            self._start_over()
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
        current_step = self.session.current_step or "menu"
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
        self.session.current_step = "menu"
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
            f"{text}\n\n0. Go back\n00. Start over\n000. Main menu",
        )

    def _get_text(self, message: dict) -> str:
        return str(message.get("text") or message.get("interactive_id") or "").strip()

    def _get_media_id(self, message: dict) -> str:
        return str(message.get("media_id") or "").strip()

    def _save_media_image(self, media_id: str, *, filename_prefix: str) -> Image:
        content = self.client.download_media(media_id)
        return Image.objects.create(
            image=ContentFile(content, name=f"{filename_prefix}_{media_id}.jpg"),
        )

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

    def _start_over(self) -> None:
        if self.session.current_step == self.initial_step:
            self._go_main_menu()
            return
        self.session.current_step = self.initial_step
        self.session.session_data = {}
        self.session.save(update_fields=["current_step", "session_data", "modified"])
        self.send_initial_prompt()

    def _go_main_menu(self) -> None:
        self._reset()
        self.client.send_text(
            self.session.phone_number,
            "How can I assist you? Reply with:\n1. Warranty Registration\n2. Warranty Claim\n3. Find a Product\n4. Raise a Complaint\n5. Certificate Reissuance",
        )

    def _send_validation_error(self, text: str) -> None:
        self._send_step_prompt(text)

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
