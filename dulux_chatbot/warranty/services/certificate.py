from django.core.files.base import ContentFile


def generate_warranty_certificate(registration):
    lines = [
        "Dulux Warranty Certificate",
        f"Registration Code: {registration.registration_code}",
        f"Customer Name: {registration.customer_name}",
        f"Phone Number: {registration.phone_number}",
        f"Purchase Date: {registration.purchase_date.isoformat()}",
        "",
        "Paint Pairs:",
    ]

    for paint_pair in registration.paint_pairs.select_related("topcoat", "basecoat").all():
        lines.append(
            f"- Topcoat: {paint_pair.topcoat.name} | Qty: {paint_pair.topcoat_quantity} | "
            f"Basecoat: {paint_pair.basecoat.name if paint_pair.basecoat else 'N/A'} | "
            f"Basecoat Qty: {paint_pair.basecoat_quantity if paint_pair.basecoat_quantity is not None else 'N/A'}"
        )

    content = "\n".join(lines).encode("utf-8")
    return ContentFile(content, name=f"warranty_certificate_{registration.registration_code}.txt")
