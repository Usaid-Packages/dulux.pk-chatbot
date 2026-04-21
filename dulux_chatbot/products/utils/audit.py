from dulux_chatbot.audit_logs.services import build_instance_snapshot
from dulux_chatbot.products.models import Product


def build_product_snapshot(product: Product) -> dict:
    return build_instance_snapshot(
        product,
        extra_data={
            "surface_type_ids": list(
                product.surface_mappings.order_by("surface_type_id").values_list("surface_type_id", flat=True)
            ),
            "basecoat_ids": list(
                product.basecoat_mappings.order_by("basecoat_id").values_list("basecoat_id", flat=True)
            ),
        },
    )
