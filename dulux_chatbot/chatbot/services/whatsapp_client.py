import logging

from urllib.parse import urljoin

import requests

from constance import config
from decouple import config as env_config
from django.conf import settings
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from dulux_chatbot.chatbot.constants import MAX_WHATSAPP_MEDIA_BYTES


logger = logging.getLogger("dulux_chatbot")
RETRY_STATUS_CODES = (429, 502, 503, 504)


def _build_request_session() -> requests.Session:
    retry_strategy = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=RETRY_STATUS_CODES,
        allowed_methods={"GET", "POST"},
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session = requests.Session()
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


REQUEST_SESSION = _build_request_session()


class WhatsAppAPIError(Exception):
    pass


def _media_size_from_metadata(metadata: dict) -> int | None:
    for key in ("file_size", "file_size_bytes", "content_length"):
        value = metadata.get(key)
        if value in (None, ""):
            continue
        try:
            return int(value)
        except (TypeError, ValueError):
            return None
    return None


def _content_length_from_response(response: requests.Response) -> int | None:
    value = response.headers.get("Content-Length")
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _validate_media_size(size: int | None) -> None:
    if size is not None and size > MAX_WHATSAPP_MEDIA_BYTES:
        raise WhatsAppAPIError("WhatsApp media exceeds the maximum allowed size.")


def _read_response_content_with_size_limit(response: requests.Response) -> bytes:
    chunks = []
    total_size = 0
    for chunk in response.iter_content(chunk_size=8192):
        if not chunk:
            continue
        total_size += len(chunk)
        _validate_media_size(total_size)
        chunks.append(chunk)
    return b"".join(chunks)


class WhatsAppClient:
    @property
    def base_url(self) -> str:
        return config.WHATSAPP_API_BASE_URL.rstrip("/")

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

    def get_media_metadata(self, media_id: str) -> dict:
        return self._get(media_id)

    def download_media_with_metadata(self, media_id: str) -> tuple[bytes, dict]:
        metadata = self.get_media_metadata(media_id)
        _validate_media_size(_media_size_from_metadata(metadata))
        media_url = metadata.get("url")
        if not media_url:
            raise WhatsAppAPIError("Media URL missing in WhatsApp response.")

        headers = {"Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}"}
        try:
            response = REQUEST_SESSION.get(
                media_url,
                headers=headers,
                timeout=config.WHATSAPP_API_TIMEOUT_SECS,
                stream=True,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.exception("WhatsApp media download failed for media id.")
            raise WhatsAppAPIError("WhatsApp media download failed.") from exc

        _validate_media_size(_content_length_from_response(response))
        return _read_response_content_with_size_limit(response), metadata

    def download_media(self, media_id: str) -> bytes:
        content, _metadata = self.download_media_with_metadata(media_id)
        return content

    def _post(self, endpoint: str, payload: dict) -> dict:
        url = f"{self.base_url}/{settings.WHATSAPP_PHONE_NUMBER_ID}/{endpoint}"
        headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }
        try:
            response = REQUEST_SESSION.post(
                url, json=payload, headers=headers, timeout=config.WHATSAPP_API_TIMEOUT_SECS
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.exception("WhatsApp API POST request failed.")
            raise WhatsAppAPIError("WhatsApp API request failed.") from exc

        return response.json()

    def _get(self, endpoint: str) -> dict:
        url = f"{self.base_url}/{endpoint}"
        headers = {"Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}"}
        try:
            response = REQUEST_SESSION.get(url, headers=headers, timeout=config.WHATSAPP_API_TIMEOUT_SECS)
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
