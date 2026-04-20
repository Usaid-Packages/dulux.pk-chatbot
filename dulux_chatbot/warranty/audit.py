from dulux_chatbot.audit_logs.services import build_instance_snapshot
from dulux_chatbot.warranty.models import ClaimQualityReview, WarrantyClaim, WarrantyRegistration


# TODO(audit DATA-03 Medium): Snapshot functions fire 3 additional queries per call
# (paint_pairs, invoices, rejection_fields) and are called twice per update (before + after).
# That's 6 extra queries per registration update inside the transaction. Use the already-
# prefetched relations from the view queryset instead of issuing new queries here.
def build_registration_snapshot(registration: WarrantyRegistration) -> dict:
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
                for pair in registration.paint_pairs.order_by("id")
            ],
            "invoice_ids": list(registration.invoices.order_by("id").values_list("image_id", flat=True)),
            "rejection_fields": [
                {"field_name": item.field_name, "note": item.note}
                for item in registration.rejection_fields.order_by("id")
            ],
        },
    )


# TODO(audit DATA-03 Medium): Same N+1 snapshot concern as registration. Claim snapshots
# fire queries for images, quality_reviews, and resubmissions (with nested entries).
# See AUDIT_FINDINGS.md DATA-03.
def build_claim_snapshot(claim: WarrantyClaim) -> dict:
    return build_instance_snapshot(
        claim,
        extra_data={
            "images": [
                {
                    "id": image.id,
                    "image_id": image.image_id,
                    "photo_type": image.photo_type,
                }
                for image in claim.images.order_by("id")
            ],
            "quality_review_ids": list(claim.quality_reviews.order_by("id").values_list("id", flat=True)),
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
                        for entry in resubmission.entries.order_by("id")
                    ],
                }
                for resubmission in claim.resubmissions.order_by("id").prefetch_related("entries")
            ],
        },
    )


def build_quality_review_snapshot(review: ClaimQualityReview) -> dict:
    return build_instance_snapshot(
        review,
        extra_data={
            "required_items": [
                {
                    "id": item.id,
                    "required_item": item.required_item,
                }
                for item in review.required_items.order_by("id")
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
