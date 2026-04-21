from dulux_chatbot.audit_logs.services import build_instance_snapshot
from dulux_chatbot.warranty.models import ClaimQualityReview, WarrantyClaim, WarrantyRegistration


def _prefetched_related(instance, related_name: str):
    return getattr(instance, "_prefetched_objects_cache", {}).get(related_name)


def _ordered_related(instance, related_name: str):
    prefetched_items = _prefetched_related(instance, related_name)
    if prefetched_items is not None:
        return sorted(prefetched_items, key=lambda item: item.id)
    return list(getattr(instance, related_name).order_by("id"))


def build_registration_snapshot(registration: WarrantyRegistration) -> dict:
    paint_pairs = _ordered_related(registration, "paint_pairs")
    invoices = _ordered_related(registration, "invoices")
    rejection_fields = _ordered_related(registration, "rejection_fields")

    return build_instance_snapshot(
        registration,
        extra_data={
            "paint_pairs": [
                {
                    "id": pair.id,
                    "topcoat_id": pair.topcoat_id,
                    "topcoat_quantity": str(pair.topcoat_quantity),
                    "basecoat_id": pair.basecoat_id,
                    "basecoat_quantity": str(pair.basecoat_quantity) if pair.basecoat_quantity is not None else None,
                }
                for pair in paint_pairs
            ],
            "invoice_ids": [invoice.image_id for invoice in invoices],
            "rejection_fields": [{"field_name": item.field_name, "note": item.note} for item in rejection_fields],
        },
    )


def build_claim_snapshot(claim: WarrantyClaim) -> dict:
    images = _ordered_related(claim, "images")
    quality_reviews = _ordered_related(claim, "quality_reviews")
    resubmissions = _ordered_related(claim, "resubmissions")

    return build_instance_snapshot(
        claim,
        extra_data={
            "images": [
                {
                    "id": image.id,
                    "image_id": image.image_id,
                    "photo_type": image.photo_type,
                }
                for image in images
            ],
            "quality_review_ids": [review.id for review in quality_reviews],
            "resubmissions": [
                {
                    "id": resubmission.id,
                    "source": resubmission.source,
                    "notes": resubmission.notes,
                    "entries": [
                        {
                            "id": entry.id,
                            "required_item": entry.required_item,
                            "response_text": entry.response_text,
                            "image_id": entry.image_id,
                        }
                        for entry in _ordered_related(resubmission, "entries")
                    ],
                }
                for resubmission in resubmissions
            ],
        },
    )


def build_quality_review_snapshot(review: ClaimQualityReview) -> dict:
    required_items = _ordered_related(review, "required_items")

    return build_instance_snapshot(
        review,
        extra_data={
            "required_items": [
                {
                    "id": item.id,
                    "required_item": item.required_item,
                }
                for item in required_items
            ]
        },
    )


def build_registration_event_label(*, action: str | None) -> str:
    action_labels = {
        "APPROVE": "Registration approved",
        "REJECT": "Registration rejected",
        "RESUBMIT": "Registration marked for resubmission",
        "IN_PROGRESS": "Registration moved to in progress",
    }
    return action_labels.get(action or "", "Registration updated")


def build_claim_event_label(*, action: str | None) -> str:
    action_labels = {
        "IN_REVIEW": "Claim moved to CS review",
        "QA_REVIEW": "Claim forwarded to quality",
        "APPROVE": "Claim approved",
        "REJECT": "Claim rejected",
    }
    return action_labels.get(action or "", "Claim updated")
