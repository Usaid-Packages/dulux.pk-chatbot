import hashlib
import hmac
import json

from base64 import b64decode, b64encode
from typing import Any

from cryptography.hazmat.primitives.asymmetric.padding import MGF1, OAEP
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.hashes import SHA256
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from decouple import config as env_config
from django.core.cache import cache
from django.core.files.base import ContentFile

from dulux_chatbot.chatbot.services.whatsapp_client import WhatsAppClient
from dulux_chatbot.core.models import Image
from dulux_chatbot.products.choices import ProductType
from dulux_chatbot.products.models import Product
from dulux_chatbot.warranty.api.v1.serializers import WarrantyRegistrationCreateSerializer
from dulux_chatbot.warranty.choices import InvoiceType


FLOW_CACHE_PREFIX = "whatsapp_flow_warranty_registration"
FLOW_CACHE_TIMEOUT_SECONDS = 60 * 60 * 24
FLOW_NAME = "Warranty Registration"
PAIR_KEYS = ("one", "two", "three")
WHATSAPP_FIELD_LABELS = {
    "customer_name": "Full Name",
    "phone_number": "Phone Number",
    "email": "Email",
    "city": "City",
    "province": "Province",
    "site_address": "Site Address",
    "purchase_date": "Purchase Date",
    "purchase_dealer": "Dealer Name",
    "purchase_dealer_city": "Dealer City",
    "purchase_dealer_address": "Dealer Address",
    "paint_pairs": "Paint Pairs",
    "paint_pair_invoices": "Invoice Photos",
}


class FlowCryptoError(Exception):
    pass


def validate_flow_request_signature(*, body: bytes, signature_header: str | None) -> bool:
    app_secret = env_config("WHATSAPP_APP_SECRET", default="").strip()
    if not app_secret:
        return True
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(app_secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    provided = signature_header.split("=", 1)[1]
    return hmac.compare_digest(expected, provided)


def decrypt_flow_request(body: dict[str, Any]) -> tuple[dict[str, Any], bytes, bytes]:
    try:
        encrypted_flow_data = b64decode(body["encrypted_flow_data"])
        encrypted_aes_key = b64decode(body["encrypted_aes_key"])
        initial_vector = b64decode(body["initial_vector"])
    except (KeyError, TypeError, ValueError) as exc:
        raise FlowCryptoError("Invalid encrypted flow payload.") from exc

    private_key_pem = env_config("WHATSAPP_FLOW_PRIVATE_KEY", default="").strip()
    if not private_key_pem:
        raise FlowCryptoError("WHATSAPP_FLOW_PRIVATE_KEY is not configured.")

    try:
        private_key = load_pem_private_key(private_key_pem.encode("utf-8"), password=None)
        aes_key = private_key.decrypt(
            encrypted_aes_key,
            OAEP(
                mgf=MGF1(algorithm=SHA256()),
                algorithm=SHA256(),
                label=None,
            ),
        )
        decryptor = Cipher(
            algorithms.AES(aes_key),
            modes.GCM(initial_vector, encrypted_flow_data[-16:]),
        ).decryptor()
        decrypted_bytes = decryptor.update(encrypted_flow_data[:-16]) + decryptor.finalize()
        decrypted_payload = json.loads(decrypted_bytes.decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise FlowCryptoError("Unable to decrypt flow request.") from exc

    if not isinstance(decrypted_payload, dict):
        raise FlowCryptoError("Decrypted flow payload must be an object.")

    return decrypted_payload, aes_key, initial_vector


def encrypt_flow_response(response_payload: dict[str, Any], aes_key: bytes, iv: bytes) -> str:
    flipped_iv = bytes(byte ^ 0xFF for byte in iv)
    encryptor = Cipher(algorithms.AES(aes_key), modes.GCM(flipped_iv)).encryptor()
    ciphertext = encryptor.update(json.dumps(response_payload).encode("utf-8")) + encryptor.finalize()
    return b64encode(ciphertext + encryptor.tag).decode("utf-8")


class WarrantyRegistrationFlowService:
    @classmethod
    def handle_exchange(cls, payload: dict[str, Any]) -> dict[str, Any]:
        action = str(payload.get("action") or "").strip()
        if action == "ping":
            return {"data": {"status": "active"}}

        flow_token = str(payload.get("flow_token") or "").strip()
        if not flow_token:
            return {"screen": "CONSENT", "data": {"error_message": "Missing flow token."}}

        incoming_data = payload.get("data") or {}
        if not isinstance(incoming_data, dict):
            return {"screen": "CONSENT", "data": {"error_message": "Invalid request data."}}

        if action == "INIT":
            cls._save_session(flow_token, {})
            return {"screen": "CONSENT", "data": {}}

        updates = cls._clean_request_data(incoming_data)
        if "action_type" not in incoming_data:
            updates["action_type"] = ""
        session_data = cls._merge_session(flow_token, updates)
        screen = str(payload.get("screen") or incoming_data.get("screen") or "").strip()

        if screen == "CONSENT":
            return cls._handle_consent(session_data)
        if screen == "CUSTOMER_DETAILS":
            return {"screen": "PURCHASE_DETAILS", "data": {}}
        if screen == "PURCHASE_DETAILS":
            return {"screen": "PAIR_ONE", "data": cls._pair_screen_data(pair_key="one")}
        if screen == "PAIR_ONE":
            return cls._handle_pair_screen(session_data=session_data, pair_key="one")
        if screen == "ADD_PAIR_TWO":
            return cls._handle_add_pair_two(session_data)
        if screen == "PAIR_TWO":
            return cls._handle_pair_screen(session_data=session_data, pair_key="two")
        if screen == "ADD_PAIR_THREE":
            return cls._handle_add_pair_three(session_data)
        if screen == "PAIR_THREE":
            return cls._handle_pair_screen(session_data=session_data, pair_key="three")

        return {"screen": "CONSENT", "data": {"error_message": "Unsupported screen."}}

    @classmethod
    def complete_registration(cls, *, phone_number: str, response_data: dict[str, Any], client: WhatsAppClient) -> bool:
        flow_name = str(response_data.get("flow_name") or "").strip()
        flow_token = str(response_data.get("flow_token") or "").strip()
        if flow_name != FLOW_NAME or not flow_token:
            return False

        session_data = cls._get_session(flow_token)
        if not session_data:
            client.send_text(phone_number, "We could not find your warranty registration details. Please try again.")
            return True

        invoice_images = cls._create_invoice_images(response_data.get("invoice_photos") or [], client=client)
        serializer = WarrantyRegistrationCreateSerializer(
            data={
                "channel": "WHATSAPP",
                "customer_name": session_data.get("customer_name", ""),
                "phone_number": phone_number,
                "email": session_data.get("email_value", ""),
                "city": session_data.get("city_value", ""),
                "province": session_data.get("province_value", ""),
                "site_address": session_data.get("site_address", ""),
                "purchase_date": session_data.get("purchase_date"),
                "purchase_dealer": session_data.get("dealer_name", ""),
                "purchase_dealer_city": session_data.get("dealer_city", ""),
                "purchase_dealer_address": session_data.get("dealer_address", ""),
                "postal_code": "",
                "notes": "",
                "paint_pairs": cls._build_paint_pairs(session_data),
                "paint_pair_invoices": invoice_images,
            }
        )

        if not serializer.is_valid():
            client.send_text(phone_number, cls._build_validation_message(serializer.errors))
            return True

        registration = serializer.save()
        cache.delete(cls._cache_key(flow_token))
        client.send_text(
            phone_number,
            (
                "Thank you for registering with Dulux Assurance Warranty Program. "
                "Our team is evaluating your submission and will get back to you within 14 working days. "
                "If you have any queries, contact us on our helpline 0800-DULUX(38589). "
                f"Registration number: {registration.registration_code}"
            ),
        )
        return True

    @classmethod
    def _handle_consent(cls, session_data: dict[str, Any]) -> dict[str, Any]:
        if str(session_data.get("consent_value") or "").upper() != "YES":
            return {
                "screen": "CONSENT",
                "data": {"error_message": "Consent is required to continue."},
            }
        return {"screen": "CUSTOMER_DETAILS", "data": {}}

    @classmethod
    def _handle_add_pair_two(cls, session_data: dict[str, Any]) -> dict[str, Any]:
        if str(session_data.get("add_pair_two") or "").upper() == "YES":
            return {"screen": "PAIR_TWO", "data": cls._pair_screen_data(pair_key="two")}
        cls._save_pair_defaults(session_data, "two")
        cls._save_pair_defaults(session_data, "three")
        cls._save_session(str(session_data.get("flow_token") or ""), session_data)
        return {"screen": "ADD_PAIR_THREE", "data": {}}

    @classmethod
    def _handle_add_pair_three(cls, session_data: dict[str, Any]) -> dict[str, Any]:
        if str(session_data.get("add_pair_three") or "").upper() == "YES":
            return {"screen": "PAIR_THREE", "data": cls._pair_screen_data(pair_key="three")}
        cls._save_pair_defaults(session_data, "three")
        cls._save_session(str(session_data.get("flow_token") or ""), session_data)
        return {"screen": "REVIEW_UPLOAD", "data": {}}

    @classmethod
    def _handle_pair_screen(cls, *, session_data: dict[str, Any], pair_key: str) -> dict[str, Any]:
        action_type = str(session_data.get("action_type") or "").strip()
        if action_type == f"LOAD_BASECOATS_{pair_key.upper()}":
            return {
                "screen": f"PAIR_{pair_key.upper()}",
                "data": cls._pair_screen_data(
                    pair_key=pair_key,
                    topcoat_id=session_data.get(f"topcoat_name_{pair_key}"),
                ),
            }

        next_screen_map = {
            "one": "ADD_PAIR_TWO",
            "two": "ADD_PAIR_THREE",
            "three": "REVIEW_UPLOAD",
        }
        return {"screen": next_screen_map[pair_key], "data": {}}

    @classmethod
    def _pair_screen_data(cls, *, pair_key: str, topcoat_id: Any | None = None) -> dict[str, Any]:
        data = {
            "topcoat_options": cls._product_options(
                Product.objects.filter(product_type=ProductType.TOPCOAT, is_active=True)
            ),
            f"basecoat_options_{pair_key}": [],
        }
        parsed_topcoat_id = cls._parse_product_id(topcoat_id)
        if parsed_topcoat_id is None:
            return data
        topcoat = Product.objects.filter(pk=parsed_topcoat_id, product_type=ProductType.TOPCOAT, is_active=True).first()
        if topcoat is None:
            return data
        data[f"basecoat_options_{pair_key}"] = cls._product_options(topcoat.basecoats.filter(is_active=True))
        return data

    @staticmethod
    def _product_options(queryset) -> list[dict[str, str]]:
        return [{"id": str(product.id), "title": product.name} for product in queryset.order_by("name")]

    @classmethod
    def _cache_key(cls, flow_token: str) -> str:
        return f"{FLOW_CACHE_PREFIX}:{flow_token}"

    @classmethod
    def _get_session(cls, flow_token: str) -> dict[str, Any]:
        cached = cache.get(cls._cache_key(flow_token), {})
        return cached if isinstance(cached, dict) else {}

    @classmethod
    def _save_session(cls, flow_token: str, session_data: dict[str, Any]) -> None:
        cache.set(cls._cache_key(flow_token), session_data, FLOW_CACHE_TIMEOUT_SECONDS)

    @classmethod
    def _merge_session(cls, flow_token: str, updates: dict[str, Any]) -> dict[str, Any]:
        session_data = cls._get_session(flow_token)
        session_data["flow_token"] = flow_token
        session_data.update(updates)
        cls._save_session(flow_token, session_data)
        return session_data

    @staticmethod
    def _clean_request_data(data: dict[str, Any]) -> dict[str, Any]:
        return {key: value for key, value in data.items() if key not in {"screen"} and value is not None}

    @classmethod
    def _save_pair_defaults(cls, session_data: dict[str, Any], pair_key: str) -> None:
        defaults = {
            f"topcoat_name_{pair_key}": "",
            f"topcoat_liters_{pair_key}": "",
            f"basecoat_name_{pair_key}": "",
            f"basecoat_liters_{pair_key}": "",
        }
        session_data.update(defaults)

    @staticmethod
    def _parse_product_id(value: Any) -> int | None:
        try:
            return int(str(value))
        except (TypeError, ValueError):
            return None

    @classmethod
    def _build_paint_pairs(cls, session_data: dict[str, Any]) -> list[dict[str, Any]]:
        paint_pairs: list[dict[str, Any]] = []
        for pair_key in PAIR_KEYS:
            topcoat_id = cls._parse_product_id(session_data.get(f"topcoat_name_{pair_key}"))
            topcoat_quantity = session_data.get(f"topcoat_liters_{pair_key}")
            if topcoat_id is None or topcoat_quantity in {None, ""}:
                continue

            pair_payload: dict[str, Any] = {
                "topcoat": topcoat_id,
                "topcoat_quantity": topcoat_quantity,
            }
            basecoat_id = cls._parse_product_id(session_data.get(f"basecoat_name_{pair_key}"))
            basecoat_quantity = session_data.get(f"basecoat_liters_{pair_key}")
            if basecoat_id is not None and basecoat_quantity not in {None, ""}:
                pair_payload["basecoat"] = basecoat_id
                pair_payload["basecoat_quantity"] = basecoat_quantity
            paint_pairs.append(pair_payload)
        return paint_pairs

    @classmethod
    def _create_invoice_images(cls, invoice_photos: Any, *, client: WhatsAppClient) -> list[dict[str, Any]]:
        if not isinstance(invoice_photos, list):
            return []

        created_images: list[dict[str, Any]] = []
        for item in invoice_photos:
            media_id = cls._extract_media_id(item)
            if not media_id:
                continue
            content = client.download_media(media_id)
            image = Image.objects.create(
                image=ContentFile(content, name=f"flow_invoice_{media_id}.jpg"),
            )
            created_images.append({"image_id": image.id, "invoice_type": InvoiceType.TOPCOAT})
        return created_images

    @staticmethod
    def _extract_media_id(item: Any) -> str:
        if isinstance(item, str):
            return item.strip()
        if not isinstance(item, dict):
            return ""
        for key in ("media_id", "id"):
            value = item.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return ""

    @classmethod
    def _format_error_labels(cls, value: Any) -> Any:
        if isinstance(value, dict):
            return {WHATSAPP_FIELD_LABELS.get(key, key): cls._format_error_labels(item) for key, item in value.items()}
        if isinstance(value, list):
            return [cls._format_error_labels(item) for item in value]
        return value

    @staticmethod
    def _build_validation_message(errors: dict[str, Any]) -> str:
        error_text = json.dumps(WarrantyRegistrationFlowService._format_error_labels(errors))
        return f"We could not submit your warranty registration. {error_text}"
