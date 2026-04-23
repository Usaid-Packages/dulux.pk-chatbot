from dulux_chatbot.products.models import Product


def format_product_message(*, product: Product) -> str:
    return (
        f"*Name:* {product.name}\n"
        f"*Features:* {product.features}\n"
        f"*Coverage details:* {product.coverage_details}\n"
        f"*URL:* {product.webpage_url}"
    )
