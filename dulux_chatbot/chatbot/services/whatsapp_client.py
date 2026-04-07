import logging

from urllib.parse import urljoin

import requests

from constance import config
from decouple import config as env_config
from django.conf import settings


logger = logging.getLogger("dulux_chatbot")


class WhatsAppAPIError(Exception):
    pass


class WhatsAppClient:
    base_url = "https://graph.facebook.com/v20.0"

    def send_text(self, to: str, text: str) -> dict:
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": text},
        }
        return self._post("messages", payload)

    def send_interactive_buttons(self, to: str, body: str, buttons: list[dict]) -> dict:
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body},
                "action": {"buttons": buttons},
            },
        }
        return self._post("messages", payload)

    def send_interactive_list(self, to: str, header: str, body: str, sections: list[dict]) -> dict:
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "list",
                "header": {"type": "text", "text": header},
                "body": {"text": body},
                "action": {"button": "Choose", "sections": sections},
            },
        }
        return self._post("messages", payload)

    def send_document(self, to: str, document_url: str, filename: str, caption: str = "") -> dict:
        absolute_document_url = self._build_absolute_media_url(document_url)
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "document",
            "document": {"link": absolute_document_url, "filename": filename, "caption": caption},
        }
        return self._post("messages", payload)

    def download_media(self, media_id: str) -> bytes:
        metadata = self._get(media_id)
        media_url = metadata.get("url")
        if not media_url:
            raise WhatsAppAPIError("Media URL missing in WhatsApp response.")

        headers = {"Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}"}
        try:
            response = requests.get(media_url, headers=headers, timeout=config.WHATSAPP_API_TIMEOUT_SECS)
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.exception("WhatsApp media download failed for media id.")
            raise WhatsAppAPIError("WhatsApp media download failed.") from exc

        return response.content

    def _post(self, endpoint: str, payload: dict) -> dict:
        url = f"{self.base_url}/{settings.WHATSAPP_PHONE_NUMBER_ID}/{endpoint}"
        headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=config.WHATSAPP_API_TIMEOUT_SECS)
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.exception("WhatsApp API POST request failed.")
            raise WhatsAppAPIError("WhatsApp API request failed.") from exc

        return response.json()

    def _get(self, endpoint: str) -> dict:
        url = f"{self.base_url}/{endpoint}"
        headers = {"Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}"}
        try:
            response = requests.get(url, headers=headers, timeout=config.WHATSAPP_API_TIMEOUT_SECS)
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.exception("WhatsApp API GET request failed.")
            raise WhatsAppAPIError("WhatsApp API request failed.") from exc

        return response.json()

    def _build_absolute_media_url(self, document_url: str) -> str:
        if document_url.startswith(("http://", "https://")):
            return document_url
        base_url = env_config("CERTIFICATE_MEDIA_URL", default="").strip() or env_config("BASE_URL", default="").strip()
        if not base_url:
            return document_url
        return urljoin(f"{base_url.rstrip('/')}/", document_url.lstrip("/"))
