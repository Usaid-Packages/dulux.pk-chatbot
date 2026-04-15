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

    def send_flow(
        self,
        to: str,
        *,
        body: str,
        flow_id: str,
        flow_token: str,
        flow_cta: str = "Start",
        screen: str | None = None,
        data: dict | None = None,
    ) -> dict:
        flow_action_payload = {}
        if screen:
            flow_action_payload["screen"] = screen
        if data:
            flow_action_payload["data"] = data

        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "flow",
                "body": {"text": body},
                "action": {
                    "name": "flow",
                    "parameters": {
                        "flow_message_version": "3",
                        "flow_id": flow_id,
                        "flow_token": flow_token,
                        "flow_cta": flow_cta,
                        "flow_action": "navigate",
                        "flow_action_payload": flow_action_payload,
                    },
                },
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

    def send_image(self, to: str, image_url: str, caption: str = "") -> dict:
        absolute_image_url = self._build_absolute_media_url(image_url)
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "image",
            "image": {"link": absolute_image_url, "caption": caption},
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
            response = getattr(exc, "response", None)
            response_text = getattr(response, "text", "") if response is not None else ""
            logger.exception("WhatsApp API POST request failed. Response: %s", response_text)
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

    def _build_absolute_media_url(self, media_url: str) -> str:
        if media_url.startswith(("http://", "https://")):
            return media_url
        base_url = env_config("CERTIFICATE_MEDIA_URL", default="").strip() or env_config("BASE_URL", default="").strip()
        if not base_url:
            return media_url
        return urljoin(f"{base_url.rstrip('/')}/", media_url.lstrip("/"))
