from collections import OrderedDict

from dulux_chatbot.chatbot.choices import FlowType


RESUBMISSION_FIELD_LABELS = {
    "customer_name": "Full Name",
    "email": "Email",
    "city": "City",
    "province": "Province",
    "site_address": "Site Address",
    "purchase_date": "Purchase Date",
    "purchase_dealer": "Dealer Name",
    "purchase_dealer_city": "Dealer City",
    "purchase_dealer_address": "Dealer Address",
    "postal_code": "Postal code",
    "paint_pairs": "Paint Details",
    "paint_pair_invoices": "Invoice Photos",
    "invoice": "Invoice Photos",
    "invoices": "Invoice Photos",
    "topcoat_invoice": "Invoice Photos",
    "basecoat_invoice": "Invoice Photos",
}

SUPPORTED_RESUBMIT_FIELD_TO_STEP = {
    "customer_name": "name",
    "email": "email",
    "city": "city",
    "province": "province",
    "site_address": "site_address",
    "purchase_date": "purchase_date",
    "purchase_dealer": "dealer_name",
    "purchase_dealer_city": "dealer_city",
    "purchase_dealer_address": "dealer_address",
    "postal_code": "postal_code",
    "paint_pairs": "topcoat_select",
    "paint_pair_invoices": "invoice_upload",
    "invoice": "invoice_upload",
    "invoices": "invoice_upload",
    "topcoat_invoice": "invoice_upload",
    "basecoat_invoice": "invoice_upload",
}

PAINT_PAIR_RELATED_FIELDS = {
    "topcoat",
    "topcoat_name",
    "topcoat_quantity",
    "basecoat",
    "basecoat_name",
    "basecoat_quantity",
}

STEP_TO_MODEL_FIELD = {
    "name": "customer_name",
    "email": "email",
    "city": "city",
    "province": "province",
    "site_address": "site_address",
    "purchase_date": "purchase_date",
    "dealer_name": "purchase_dealer",
    "dealer_city": "purchase_dealer_city",
    "dealer_address": "purchase_dealer_address",
    "postal_code": "postal_code",
}


def normalize_rejection_field_name(field_name: str) -> str:
    normalized = (field_name or "").strip().lower()
    if normalized in SUPPORTED_RESUBMIT_FIELD_TO_STEP:
        return normalized
    if any(token in normalized for token in PAINT_PAIR_RELATED_FIELDS):
        return "paint_pairs"
    return normalized


def get_resubmission_field_label(field_name: str) -> str:
    normalized = normalize_rejection_field_name(field_name)
    return RESUBMISSION_FIELD_LABELS.get(normalized, field_name or "Field")


def build_resubmit_steps(field_names: list[str]) -> tuple[list[str], list[str]]:
    ordered_steps: OrderedDict[str, None] = OrderedDict()
    unsupported_fields: list[str] = []

    for field_name in field_names:
        normalized = normalize_rejection_field_name(field_name)
        step = SUPPORTED_RESUBMIT_FIELD_TO_STEP.get(normalized)
        if step is None:
            unsupported_fields.append(field_name)
            continue
        ordered_steps.setdefault(step, None)

    return list(ordered_steps.keys()), unsupported_fields


def fallback_resubmit_message() -> str:
    return (
        "If you are unable to complete the resubmission in this active session, "
        "please raise a complaint and live chat with a Customer Service Representative."
    )


def is_registration_resubmit_session(session_data: dict) -> bool:
    return bool(session_data.get("resubmit_registration_id"))


def initial_resubmit_session_data(*, registration) -> dict:
    session_data = {
        "customer_name": registration.customer_name,
        "email": registration.email,
        "city": registration.city,
        "province": registration.province,
        "site_address": registration.site_address,
        "purchase_date": registration.purchase_date.isoformat(),
        "purchase_dealer": registration.purchase_dealer,
        "purchase_dealer_city": registration.purchase_dealer_city,
        "purchase_dealer_address": registration.purchase_dealer_address,
        "postal_code": registration.postal_code,
        "paint_pairs": [],
        "paint_pair_invoices": [],
    }

    for paint_pair in registration.paint_pairs.all().order_by("id"):
        pair_payload = {
            "topcoat_id": paint_pair.topcoat_id,
            "topcoat_quantity": str(paint_pair.topcoat_quantity),
        }
        if paint_pair.basecoat_id is not None:
            pair_payload["basecoat_id"] = paint_pair.basecoat_id
            pair_payload["basecoat_quantity"] = str(paint_pair.basecoat_quantity)
        session_data["paint_pairs"].append(pair_payload)

    for invoice in registration.invoices.all().order_by("id"):
        session_data["paint_pair_invoices"].append(
            {
                "image_id": invoice.image_id,
                "invoice_type": invoice.invoice_type,
            }
        )

    return session_data


def resubmit_flow_type() -> str:
    return FlowType.REGISTRATION
