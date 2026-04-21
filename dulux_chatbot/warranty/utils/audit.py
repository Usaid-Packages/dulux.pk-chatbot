from dulux_chatbot.audit_logs.services import build_instance_snapshot
from dulux_chatbot.core.models import Image
from dulux_chatbot.products.models import Product
from dulux_chatbot.warranty.models import ClaimQualityReview, WarrantyClaim, WarrantyRegistration


def _prefetched_related(instance, related_name: str):
    return getattr(instance, "_prefetched_objects_cache", {}).get(related_name)


def _ordered_related(instance, related_name: str):
    prefetched_items = _prefetched_related(instance, related_name)
    if prefetched_items is not None:
        return sorted(prefetched_items, key=lambda item: item.id)
    return list(getattr(instance, related_name).order_by("id"))


def _cached_or_bulk_products(paint_pairs: list) -> dict[int, Product]:
    products: dict[int, Product] = {}
    missing_product_ids: set[int] = set()
    for pair in paint_pairs:
        for field_name in ("topcoat", "basecoat"):
            product_id = getattr(pair, f"{field_name}_id", None)
            if not product_id:
                continue
            product = pair._state.fields_cache.get(field_name)
            if product is not None:
                products[product_id] = product
            else:
                missing_product_ids.add(product_id)

    if missing_product_ids:
        products.update(Product.objects.in_bulk(missing_product_ids))
    return products


def _product_data(product_id: int | None, products: dict[int, Product]) -> dict | None:
    if product_id is None:
        return None
    product = products.get(product_id)
    if product is None:
        return {"id": product_id}
    return {
        "id": product.id,
        "name": product.name,
        "product_type": product.product_type,
        "warranty_years": product.warranty_years,
    }


def _cached_or_bulk_images(invoices: list) -> dict[int, Image]:
    images: dict[int, Image] = {}
    missing_image_ids: set[int] = set()
    for invoice in invoices:
        if invoice.image_id is None:
            continue
        image = invoice._state.fields_cache.get("image")
        if image is not None:
            images[invoice.image_id] = image
        else:
            missing_image_ids.add(invoice.image_id)

    if missing_image_ids:
        images.update(Image.objects.in_bulk(missing_image_ids))
    return images


def _image_url(image: Image | None) -> str:
    if image is None or not image.image:
        return ""
    return image.image.url


def build_registration_snapshot(registration: WarrantyRegistration) -> dict:
    paint_pairs = _ordered_related(registration, "paint_pairs")
    invoices = _ordered_related(registration, "invoices")
    rejection_fields = _ordered_related(registration, "rejection_fields")
    products = _cached_or_bulk_products(paint_pairs)
    images = _cached_or_bulk_images(invoices)

    return build_instance_snapshot(
        registration,
        extra_data={
            "paint_pairs": [
                {
                    "id": pair.id,
                    "topcoat_id": pair.topcoat_id,
                    "topcoat": _product_data(pair.topcoat_id, products),
                    "topcoat_quantity": str(pair.topcoat_quantity),
                    "basecoat_id": pair.basecoat_id,
                    "basecoat": _product_data(pair.basecoat_id, products),
                    "basecoat_quantity": str(pair.basecoat_quantity) if pair.basecoat_quantity is not None else None,
                }
                for pair in paint_pairs
            ],
            "invoice_ids": [invoice.image_id for invoice in invoices],
            "invoices": [
                {
                    "id": invoice.id,
                    "invoice_type": invoice.invoice_type,
                    "image_id": invoice.image_id,
                    "image_url": _image_url(images.get(invoice.image_id)),
                }
                for invoice in invoices
            ],
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
