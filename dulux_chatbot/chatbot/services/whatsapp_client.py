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
    # TODO(audit S4): Hardcoded base URL blocks pointing stage at Meta's sandbox
    # without a code change. Move to settings (e.g. WHATSAPP_API_BASE_URL loaded
    # via decouple.config) and read it in __init__.
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

    # TODO(audit I1): No retry / backoff. A single transient Meta error (429, 502,
    # connection reset) raises WhatsAppAPIError immediately, so every Celery task
    # that calls send_text/send_document is a one-shot. Use a module-level
    # `requests.Session()` with `HTTPAdapter(max_retries=Retry(total=3,
    # backoff_factor=0.5, status_forcelist=(429, 502, 503, 504),
    # respect_retry_after_header=True))` and reuse it across calls so we also get
    # connection pooling. Applies equally to _get() and download_media().
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

    # TODO(audit I1): Silent fallback — if neither CERTIFICATE_MEDIA_URL nor
    # BASE_URL is set, this returns the relative path (e.g. "/django-media/...").
    # Meta then rejects the document/image, the Celery task reports success, and
    # the customer never receives their warranty PDF. Fail fast instead: raise
    # WhatsAppAPIError when the base URL is missing, and read the base URL from
    # Django settings at import time so misconfiguration is caught on boot.
    def _build_absolute_media_url(self, media_url: str) -> str:
        if media_url.startswith(("http://", "https://")):
            return media_url
        base_url = env_config("CERTIFICATE_MEDIA_URL", default="").strip() or env_config("BASE_URL", default="").strip()
        if not base_url:
            return media_url
        return urljoin(f"{base_url.rstrip('/')}/", media_url.lstrip("/"))
