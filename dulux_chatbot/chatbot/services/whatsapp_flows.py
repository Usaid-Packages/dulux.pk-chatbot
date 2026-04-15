import hashlib
import hmac
import json

from base64 import b64decode, b64encode
from typing import Any
from uuid import uuid4

from cryptography.hazmat.primitives.asymmetric.padding import MGF1, OAEP
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.hashes import SHA256
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from decouple import config as env_config
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.db import transaction

from dulux_chatbot.chatbot.choices import FlowType
from dulux_chatbot.chatbot.constants import MIN_EXCLUSIVE_WHATSAPP_WARRANTY_OPTION_YEARS
from dulux_chatbot.chatbot.services.whatsapp_client import WhatsAppClient
from dulux_chatbot.complaints.choices import MessageSender
from dulux_chatbot.complaints.models import ChatMessage, Complaint, ComplaintImage
from dulux_chatbot.complaints.realtime import broadcast_complaint_created
from dulux_chatbot.core.models import Image
from dulux_chatbot.products.choices import ProductType
from dulux_chatbot.products.models import Product, SurfaceType
from dulux_chatbot.warranty.api.v1.serializers import (
    WarrantyClaimCreateSerializer,
    WarrantyRegistrationCreateSerializer,
)
from dulux_chatbot.warranty.choices import ClaimState, InvoiceType, IssueType, PhotoType, RegistrationState
from dulux_chatbot.warranty.models import RegistrationPaintPair, WarrantyRegistration
from dulux_chatbot.warranty.services.certificate import generate_warranty_certificate


FLOW_CACHE_PREFIX = "whatsapp_flow_warranty_registration"
FLOW_CACHE_TIMEOUT_SECONDS = 60 * 60 * 24
FLOW_NAME = "Warranty Registration"
FLOW_NAME_BY_TYPE = {
    FlowType.REGISTRATION: FLOW_NAME,
    FlowType.CLAIM: "Warranty Claim",
    FlowType.FIND_PRODUCT: "Find a Product",
    FlowType.COMPLAINT: "Raise a Complaint",
    FlowType.REISSUANCE: "Certificate Reissuance",
}
FLOW_TYPE_BY_NAME = {flow_name: flow_type for flow_type, flow_name in FLOW_NAME_BY_TYPE.items()}
FLOW_ID_ENV_BY_TYPE = {
    FlowType.REGISTRATION: "WHATSAPP_FLOW_ID_WARRANTY_REGISTRATION",
    FlowType.CLAIM: "WHATSAPP_FLOW_ID_WARRANTY_CLAIM",
    FlowType.FIND_PRODUCT: "WHATSAPP_FLOW_ID_FIND_PRODUCT",
    FlowType.COMPLAINT: "WHATSAPP_FLOW_ID_COMPLAINT",
    FlowType.REISSUANCE: "WHATSAPP_FLOW_ID_CERTIFICATE_REISSUANCE",
}
PAIR_KEYS = ("one", "two", "three")
CLAIM_BLOCKING_STATES = (
    ClaimState.SUBMITTED,
    ClaimState.IN_REVIEW,
    ClaimState.QA_REVIEW,
    ClaimState.QA_APPROVED,
    ClaimState.QA_REJECTED,
    ClaimState.RESUBMIT,
    ClaimState.APPROVED,
)
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


def build_flow_token(flow_type: str) -> str:
    return f"{flow_type}:{uuid4().hex}"


def get_flow_id(flow_type: str) -> str:
    env_name = FLOW_ID_ENV_BY_TYPE.get(flow_type, "")
    return env_config(env_name, default="").strip() if env_name else ""


def get_flow_name(flow_type: str) -> str:
    return FLOW_NAME_BY_TYPE.get(flow_type, str(flow_type))


def detect_flow_type(payload: dict[str, Any]) -> str:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    flow_name = str(data.get("flow_name") or payload.get("flow_name") or "").strip()
    if flow_name in FLOW_TYPE_BY_NAME:
        return FLOW_TYPE_BY_NAME[flow_name]

    flow_token = str(payload.get("flow_token") or data.get("flow_token") or "").strip()
    flow_type = flow_token.split(":", 1)[0]
    if flow_type in FLOW_NAME_BY_TYPE:
        return flow_type
    return FlowType.REGISTRATION


def flow_option(*, option_id: Any, title: str, description: str = "") -> dict[str, str]:
    option = {"id": str(option_id), "title": title[:30]}
    if description:
        option["description"] = description[:300]
    return option


def parse_int(value: Any) -> int | None:
    try:
        return int(str(value))
    except (TypeError, ValueError):
        return None


def stringify_error_details(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: stringify_error_details(item) for key, item in value.items()}
    if isinstance(value, list):
        return [stringify_error_details(item) for item in value]
    return str(value)


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
    def complete_registration(
        cls,
        *,
        phone_number: str,
        response_data: dict[str, Any],
        client: WhatsAppClient,
    ) -> bool:
        flow_name = str(response_data.get("flow_name") or "").strip()
        flow_token = str(response_data.get("flow_token") or "").strip()
        is_registration_flow = flow_name == FLOW_NAME or flow_token.startswith(f"{FlowType.REGISTRATION}:")
        if not is_registration_flow or not flow_token:
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
                Product.objects.filter(
                    product_type=ProductType.TOPCOAT,
                    is_active=True,
                    warranty_years__gt=MIN_EXCLUSIVE_WHATSAPP_WARRANTY_OPTION_YEARS,
                )
            ),
            f"basecoat_options_{pair_key}": [],
        }
        parsed_topcoat_id = cls._parse_product_id(topcoat_id)
        if parsed_topcoat_id is None:
            return data
        topcoat = Product.objects.filter(
            pk=parsed_topcoat_id,
            product_type=ProductType.TOPCOAT,
            is_active=True,
        ).first()
        if topcoat is None:
            return data
        data[f"basecoat_options_{pair_key}"] = cls._product_options(
            topcoat.basecoats.filter(
                is_active=True,
                warranty_years__gt=MIN_EXCLUSIVE_WHATSAPP_WARRANTY_OPTION_YEARS,
            )
        )
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
        error_text = json.dumps(stringify_error_details(WarrantyRegistrationFlowService._format_error_labels(errors)))
        return f"We could not submit your warranty registration. {error_text}"


class WhatsAppFlowDataExchangeService:
    @classmethod
    def handle_exchange(cls, payload: dict[str, Any]) -> dict[str, Any]:
        action = str(payload.get("action") or "").strip()
        if action == "ping":
            return {"data": {"status": "active"}}

        flow_type = detect_flow_type(payload)
        if flow_type == FlowType.REGISTRATION:
            return WarrantyRegistrationFlowService.handle_exchange(payload)
        if flow_type == FlowType.FIND_PRODUCT:
            return FindProductFlowService.handle_exchange(payload)
        if flow_type == FlowType.COMPLAINT:
            return ComplaintFlowService.handle_exchange(payload)
        if flow_type == FlowType.CLAIM:
            return ClaimFlowService.handle_exchange(payload)
        if flow_type == FlowType.REISSUANCE:
            return ReissuanceFlowService.handle_exchange(payload)
        return {"screen": "ERROR", "data": {"error_message": "Unsupported WhatsApp Flow."}}


class FindProductFlowService:
    @classmethod
    def handle_exchange(cls, payload: dict[str, Any]) -> dict[str, Any]:
        action = str(payload.get("action") or "").strip()
        data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
        screen = str(payload.get("screen") or data.get("screen") or "").strip()

        if action == "INIT" or not screen:
            return {"screen": "SELECT_ENVIRONMENT", "data": cls._environment_screen_data()}
        if screen == "SELECT_ENVIRONMENT":
            return {"screen": "SELECT_SURFACE", "data": cls._surface_screen_data(data.get("environment"))}
        if screen == "SELECT_SURFACE":
            return {"screen": "REVIEW", "data": cls._product_screen_data(data.get("surface_type"))}
        return {"screen": "SELECT_ENVIRONMENT", "data": cls._environment_screen_data()}

    @staticmethod
    def _environment_screen_data() -> dict[str, Any]:
        return {
            "environment_options": [
                flow_option(option_id="INTERIOR", title="Interior"),
                flow_option(option_id="EXTERIOR", title="Exterior"),
            ]
        }

    @staticmethod
    def _surface_screen_data(environment: Any) -> dict[str, Any]:
        environment_value = str(environment or "").strip().upper()
        surface_types = SurfaceType.objects.filter(environment=environment_value).order_by("name")
        return {
            "surface_type_options": [
                flow_option(option_id=surface_type.id, title=surface_type.name) for surface_type in surface_types
            ]
        }

    @staticmethod
    def _product_screen_data(surface_type_id: Any) -> dict[str, Any]:
        parsed_surface_type_id = parse_int(surface_type_id)
        if parsed_surface_type_id is None:
            return {
                "surface_type": "",
                "product_summary": "No products found for this surface type.",
            }
        products = Product.objects.filter(
            surface_mappings__surface_type_id=parsed_surface_type_id,
            is_active=True,
        ).order_by("name")
        return {
            "surface_type": str(parsed_surface_type_id),
            "product_summary": "\n".join(product.name for product in products[:10])
            or "No products found for this surface type.",
        }


class ComplaintFlowService:
    @classmethod
    def handle_exchange(cls, payload: dict[str, Any]) -> dict[str, Any]:
        action = str(payload.get("action") or "").strip()
        data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
        if action == "INIT":
            return {"screen": "COMPLAINT_DETAILS", "data": {}}
        return {
            "screen": "COMPLAINT_REVIEW",
            "data": {
                "customer_name": str(data.get("customer_name") or ""),
                "subject": str(data.get("subject") or ""),
                "description": str(data.get("description") or ""),
                "images": data.get("images") or [],
            },
        }


class ClaimFlowService:
    @classmethod
    def handle_exchange(cls, payload: dict[str, Any]) -> dict[str, Any]:
        action = str(payload.get("action") or "").strip()
        data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
        screen = str(payload.get("screen") or data.get("screen") or "").strip()

        if action == "INIT" or not screen:
            return {"screen": "REGISTRATION_LOOKUP", "data": cls._issue_type_screen_data()}
        if screen == "REGISTRATION_LOOKUP":
            return cls._paint_pair_screen_response(data)
        if screen == "PAINT_PAIR_SELECT":
            return {
                "screen": "CLAIM_DETAILS",
                "data": {
                    **cls._issue_type_screen_data(),
                    "registration_code": str(data.get("registration_code") or ""),
                    "paint_pair": str(data.get("paint_pair") or ""),
                },
            }
        if screen == "CLAIM_DETAILS":
            return {
                "screen": "CLAIM_PHOTOS",
                "data": {
                    "registration_code": str(data.get("registration_code") or ""),
                    "paint_pair": str(data.get("paint_pair") or ""),
                    "issue_type": str(data.get("issue_type") or ""),
                    "affected_area_sqft": str(data.get("affected_area_sqft") or ""),
                    "notes": str(data.get("notes") or ""),
                },
            }
        return {"screen": "REGISTRATION_LOOKUP", "data": cls._issue_type_screen_data()}

    @classmethod
    def _paint_pair_screen_response(cls, data: dict[str, Any]) -> dict[str, Any]:
        registration = cls._get_approved_registration(data.get("registration_code"))
        if registration is None:
            return {
                "screen": "REGISTRATION_LOOKUP",
                "data": {
                    **cls._issue_type_screen_data(),
                    "error_message": "Approved registration not found.",
                },
            }
        paint_pairs = RegistrationPaintPair.objects.select_related("topcoat").filter(registration=registration)
        return {
            "screen": "PAINT_PAIR_SELECT",
            "data": {
                "registration_id": str(registration.id),
                "registration_code": registration.registration_code,
                "paint_pair_options": [
                    flow_option(option_id=paint_pair.id, title=paint_pair.topcoat.name) for paint_pair in paint_pairs
                ],
            },
        }

    @staticmethod
    def _issue_type_screen_data() -> dict[str, Any]:
        return {"issue_type_options": [flow_option(option_id=value, title=label) for value, label in IssueType.choices]}

    @staticmethod
    def _get_approved_registration(registration_code: Any) -> WarrantyRegistration | None:
        code = str(registration_code or "").strip()
        if not code:
            return None
        return WarrantyRegistration.objects.filter(registration_code=code, state=RegistrationState.APPROVED).first()


class ReissuanceFlowService:
    @classmethod
    def handle_exchange(cls, payload: dict[str, Any]) -> dict[str, Any]:
        action = str(payload.get("action") or "").strip()
        data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
        screen = str(payload.get("screen") or data.get("screen") or "").strip()

        if action == "INIT" or not screen:
            return {"screen": "PHONE_LOOKUP", "data": {}}
        if screen == "PHONE_LOOKUP":
            registrations = cls._approved_registrations_for_phone(data.get("phone_number"))
            if not registrations:
                return {"screen": "PHONE_LOOKUP", "data": {"error_message": "No approved registration found."}}
            return {
                "screen": "REGISTRATION_SELECT",
                "data": {
                    "registration_options": [
                        flow_option(
                            option_id=registration.id,
                            title=registration.registration_code,
                            description=registration.purchase_date.strftime("%d/%m/%Y"),
                        )
                        for registration in registrations
                    ]
                },
            }
        return {"screen": "PHONE_LOOKUP", "data": {}}

    @staticmethod
    def _approved_registrations_for_phone(phone_number: Any) -> list[WarrantyRegistration]:
        normalized_phone_number = normalize_pakistan_phone_number(str(phone_number or ""))
        if not normalized_phone_number:
            return []
        return list(
            WarrantyRegistration.objects.filter(
                phone_number=normalized_phone_number,
                state=RegistrationState.APPROVED,
            ).order_by("-purchase_date", "-created")
        )


class WhatsAppFlowCompletionService:
    @classmethod
    def complete(cls, *, phone_number: str, response_data: dict[str, Any], client: WhatsAppClient) -> bool:
        flow_type = cls.detect_response_flow_type(response_data)
        if flow_type == FlowType.REGISTRATION:
            return WarrantyRegistrationFlowService.complete_registration(
                phone_number=phone_number,
                response_data=response_data,
                client=client,
            )
        if flow_type == FlowType.FIND_PRODUCT:
            return cls._complete_find_product(phone_number=phone_number, response_data=response_data, client=client)
        if flow_type == FlowType.COMPLAINT:
            return cls._complete_complaint(phone_number=phone_number, response_data=response_data, client=client)
        if flow_type == FlowType.CLAIM:
            return cls._complete_claim(phone_number=phone_number, response_data=response_data, client=client)
        if flow_type == FlowType.REISSUANCE:
            return cls._complete_reissuance(phone_number=phone_number, response_data=response_data, client=client)
        return False

    @staticmethod
    def detect_response_flow_type(response_data: dict[str, Any]) -> str:
        flow_name = str(response_data.get("flow_name") or "").strip()
        if flow_name in FLOW_TYPE_BY_NAME:
            return FLOW_TYPE_BY_NAME[flow_name]
        flow_token = str(response_data.get("flow_token") or "").strip()
        flow_type = flow_token.split(":", 1)[0]
        if flow_type in FLOW_NAME_BY_TYPE:
            return flow_type
        return ""

    @classmethod
    def _complete_find_product(
        cls, *, phone_number: str, response_data: dict[str, Any], client: WhatsAppClient
    ) -> bool:
        surface_type_id = parse_int(response_data.get("surface_type") or response_data.get("surface_type_id"))
        if surface_type_id is None:
            client.send_text(phone_number, "Please select a valid surface type.")
            return True
        products = list(
            Product.objects.filter(surface_mappings__surface_type_id=surface_type_id, is_active=True)
            .prefetch_related("images__image")
            .order_by("name")
        )
        if not products:
            client.send_text(phone_number, "No products found for the selected surface type.")
            return True

        for product in products:
            product_message = cls._format_product_message(product=product)
            product_image = next(iter(product.images.all()), None)
            if product_image is not None:
                client.send_image(phone_number, product_image.image.image.url, product_message)
            else:
                client.send_text(phone_number, product_message)
        return True

    @staticmethod
    def _format_product_message(*, product: Product) -> str:
        return (
            f"*Name:* {product.name}\n"
            f"*Features:* {product.features}\n"
            f"*Coverage details:* {product.coverage_details}\n"
            f"*URL:* {product.webpage_url}"
        )

    @classmethod
    @transaction.atomic
    def _complete_complaint(cls, *, phone_number: str, response_data: dict[str, Any], client: WhatsAppClient) -> bool:
        subject = str(response_data.get("subject") or "").strip()
        description = str(response_data.get("description") or "").strip()
        if not subject or not description:
            client.send_text(phone_number, "Complaint subject and description are required.")
            return True

        registration = WarrantyRegistration.objects.filter(phone_number=phone_number).order_by("-created").first()
        complaint = Complaint.objects.create(
            registration=registration,
            phone_number=phone_number,
            customer_name=response_data.get("customer_name") or phone_number,
            subject=subject[:255],
            description=description,
        )
        for image in cls._create_images(response_data.get("images") or response_data.get("complaint_images"), client):
            ComplaintImage.objects.create(complaint=complaint, image=image)
        ChatMessage.objects.create(complaint=complaint, sender=MessageSender.CUSTOMER, text=description)
        broadcast_complaint_created(complaint=complaint)
        client.send_text(
            phone_number,
            (
                "Complaint created successfully. Customer Support Representative will contact you soon. "
                "Write MAIN MENU if you want to return to the main menu."
            ),
        )
        return True

    @classmethod
    def _complete_claim(cls, *, phone_number: str, response_data: dict[str, Any], client: WhatsAppClient) -> bool:
        registration_code = str(response_data.get("registration_code") or "").strip()
        registration = WarrantyRegistration.objects.filter(
            registration_code=registration_code,
            state=RegistrationState.APPROVED,
        ).first()
        if registration is None:
            client.send_text(phone_number, "Approved registration not found.")
            return True

        paint_pair = (
            RegistrationPaintPair.objects.select_related("topcoat", "basecoat")
            .filter(
                pk=parse_int(response_data.get("paint_pair") or response_data.get("paint_pair_id")),
                registration=registration,
            )
            .first()
        )
        if paint_pair is None:
            client.send_text(phone_number, "Selected paint product was not found for this registration.")
            return True
        if cls._claim_exists(registration=registration, paint_pair=paint_pair):
            client.send_text(phone_number, "A claim already exists for the selected paint pair.")
            return True

        claim_images = cls._build_claim_images(response_data=response_data, client=client)
        serializer = WarrantyClaimCreateSerializer(
            data={
                "registration": registration.id,
                "paint_pair": paint_pair.id,
                "issue_type": response_data.get("issue_type"),
                "affected_area_sqft": response_data.get("affected_area_sqft"),
                "notes": response_data.get("notes") or "",
                "images": claim_images,
            }
        )
        if not serializer.is_valid():
            client.send_text(
                phone_number,
                f"We could not submit your warranty claim. {json.dumps(stringify_error_details(serializer.errors))}",
            )
            return True

        claim = serializer.save()

        client.send_text(
            phone_number,
            f"Claim submitted successfully for Registration number: {claim.registration.registration_code}",
        )
        return True

    @staticmethod
    def _claim_exists(*, registration: WarrantyRegistration, paint_pair: RegistrationPaintPair) -> bool:
        return registration.claims.filter(paint_pair=paint_pair, state__in=CLAIM_BLOCKING_STATES).exists()

    @classmethod
    def _build_claim_images(cls, *, response_data: dict[str, Any], client: WhatsAppClient) -> list[dict[str, Any]]:
        claim_photos = response_data.get("claim_photos")
        if isinstance(claim_photos, list):
            return cls._build_claim_images_from_list(claim_photos=claim_photos, client=client)

        photo_fields = (
            ("long_shot_photo", PhotoType.LONG_SHOT),
            ("close_shot_photo", PhotoType.CLOSE_SHOT),
            ("alternate_angle_photo", PhotoType.ALTERNATE_ANGLE),
        )
        claim_images = []
        for field_name, photo_type in photo_fields:
            media_id = cls._extract_single_media_id(response_data.get(field_name))
            if not media_id:
                continue
            image = cls._create_image(media_id=media_id, client=client, filename_prefix="flow_claim")
            claim_images.append({"image_id": image.id, "photo_type": photo_type})
        return claim_images

    @classmethod
    def _build_claim_images_from_list(cls, *, claim_photos: list, client: WhatsAppClient) -> list[dict[str, Any]]:
        photo_types = (PhotoType.LONG_SHOT, PhotoType.CLOSE_SHOT, PhotoType.ALTERNATE_ANGLE)
        claim_images = []
        for media_item, photo_type in zip(claim_photos, photo_types, strict=False):
            media_id = cls._extract_single_media_id(media_item)
            if not media_id:
                continue
            image = cls._create_image(media_id=media_id, client=client, filename_prefix="flow_claim")
            claim_images.append({"image_id": image.id, "photo_type": photo_type})
        return claim_images

    @classmethod
    def _complete_reissuance(cls, *, phone_number: str, response_data: dict[str, Any], client: WhatsAppClient) -> bool:
        registration = cls._get_reissuance_registration(phone_number=phone_number, response_data=response_data)
        if registration is None:
            client.send_text(phone_number, "Approved registration not found.")
            return True
        if registration.warranty_certificate and not registration.warranty_certificate.name.lower().endswith(".pdf"):
            registration.warranty_certificate.delete(save=False)
            registration.warranty_certificate = None
            registration.save(update_fields=["warranty_certificate"])
        if not registration.warranty_certificate:
            content = generate_warranty_certificate(registration)
            registration.warranty_certificate.save(content.name, content, save=True)
        client.send_text(phone_number, "Please wait while we send your selected warranty certificate.")
        client.send_document(
            phone_number,
            registration.warranty_certificate.url,
            "warranty_certificate.pdf",
            "Your warranty certificate",
        )
        return True

    @staticmethod
    def _get_reissuance_registration(
        *, phone_number: str, response_data: dict[str, Any]
    ) -> WarrantyRegistration | None:
        registration_id = response_data.get("registration") or response_data.get("registration_id")
        parsed_registration_id = parse_int(registration_id)
        if parsed_registration_id is not None:
            return WarrantyRegistration.objects.filter(
                pk=parsed_registration_id,
                state=RegistrationState.APPROVED,
            ).first()
        registration_code = str(response_data.get("registration_code") or "").strip()
        if registration_code:
            return WarrantyRegistration.objects.filter(
                registration_code=registration_code,
                state=RegistrationState.APPROVED,
            ).first()
        lookup_phone_number = normalize_pakistan_phone_number(str(response_data.get("phone_number") or ""))
        return (
            WarrantyRegistration.objects.filter(
                phone_number=lookup_phone_number or phone_number,
                state=RegistrationState.APPROVED,
            )
            .order_by("-purchase_date", "-created")
            .first()
        )

    @classmethod
    def _create_images(cls, media_items: Any, client: WhatsAppClient) -> list[Image]:
        if not isinstance(media_items, list):
            media_items = [media_items] if media_items else []
        images = []
        for media_item in media_items:
            media_id = cls._extract_single_media_id(media_item)
            if media_id:
                images.append(cls._create_image(media_id=media_id, client=client, filename_prefix="flow_upload"))
        return images

    @staticmethod
    def _extract_single_media_id(item: Any) -> str:
        if isinstance(item, str):
            return item.strip()
        if not isinstance(item, dict):
            return ""
        for key in ("media_id", "id"):
            value = item.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return ""

    @staticmethod
    def _create_image(*, media_id: str, client: WhatsAppClient, filename_prefix: str) -> Image:
        content = client.download_media(media_id)
        return Image.objects.create(image=ContentFile(content, name=f"{filename_prefix}_{media_id}.jpg"))


def normalize_pakistan_phone_number(value: str) -> str:
    normalized = "".join(character for character in value if character.isdigit())
    if normalized.startswith("00"):
        normalized = normalized[2:]
    if normalized.startswith("0"):
        normalized = f"92{normalized[1:]}"
    if len(normalized) == 12 and normalized.startswith("92") and normalized[2] == "3":
        return normalized
    return ""
