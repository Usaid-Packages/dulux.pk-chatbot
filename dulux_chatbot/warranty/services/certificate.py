from io import BytesIO

from django.core.files.base import ContentFile
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


HEADER_COLOR = colors.HexColor("#123E7C")
ACCENT_COLOR = colors.HexColor("#E9EFF8")
BORDER_COLOR = colors.HexColor("#C8D6EA")
TEXT_COLOR = colors.HexColor("#1F2937")


def _build_info_table(registration, styles):
    warranty_years = max(
        (
            paint_pair.topcoat.warranty_years
            for paint_pair in registration.paint_pairs.select_related("topcoat").all()
            if paint_pair.topcoat_id
        ),
        default=0,
    )
    issuance_date = registration.approved_at.date() if registration.approved_at else timezone.localdate()
    data = [
        [
            Paragraph("<b>Customer Name:</b>", styles["label"]),
            Paragraph(registration.customer_name, styles["value"]),
            Paragraph("<b>Registration No:</b>", styles["label"]),
            Paragraph(registration.registration_code, styles["value"]),
        ],
        [
            Paragraph("<b>Mobile No.:</b>", styles["label"]),
            Paragraph(registration.phone_number, styles["value"]),
            Paragraph("<b>Issuance Date:</b>", styles["label"]),
            Paragraph(issuance_date.strftime("%d/%m/%Y"), styles["value"]),
        ],
        [
            Paragraph("<b>Site Address:</b>", styles["label"]),
            Paragraph(registration.site_address, styles["value"]),
            Paragraph("<b>Warranty Years:</b>", styles["label"]),
            Paragraph(str(warranty_years), styles["value"]),
        ],
        [
            Paragraph("<b>Purchase Date:</b>", styles["label"]),
            Paragraph(registration.purchase_date.strftime("%d/%m/%Y"), styles["value"]),
            Paragraph("<b>Dealer:</b>", styles["label"]),
            Paragraph(registration.purchase_dealer, styles["value"]),
        ],
        [
            Paragraph("<b>City / Province:</b>", styles["label"]),
            Paragraph(f"{registration.city} / {registration.province or 'N/A'}", styles["value"]),
            Paragraph("<b>Dealer City:</b>", styles["label"]),
            Paragraph(registration.purchase_dealer_city, styles["value"]),
        ],
        [
            Paragraph("<b>Dealer Address:</b>", styles["label"]),
            Paragraph(registration.purchase_dealer_address, styles["value"]),
            "",
            "",
        ],
    ]
    table = Table(data, colWidths=[34 * mm, 63 * mm, 34 * mm, 50 * mm], repeatRows=0)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.75, BORDER_COLOR),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def _build_product_table(title, rows, styles):
    table_rows = [[Paragraph("<b>Sr. No</b>", styles["table_header"])]]
    if title == "Top Coat Details":
        table_rows[0].extend(
            [
                Paragraph("<b>Name</b>", styles["table_header"]),
                Paragraph("<b>Quantity (L)</b>", styles["table_header"]),
                Paragraph("<b>Warranty Years</b>", styles["table_header"]),
            ]
        )
    else:
        table_rows[0].extend(
            [
                Paragraph("<b>Name</b>", styles["table_header"]),
                Paragraph("<b>Quantity (L)</b>", styles["table_header"]),
            ]
        )

    for index, row in enumerate(rows, start=1):
        current_row = [
            Paragraph(str(index), styles["table_cell"]),
            Paragraph(row["name"], styles["table_cell"]),
            Paragraph(str(row["quantity"]), styles["table_cell"]),
        ]
        if title == "Top Coat Details":
            current_row.append(Paragraph(str(row["warranty_years"]), styles["table_cell"]))
        table_rows.append(current_row)

    col_widths = [20 * mm, 92 * mm, 35 * mm]
    if title == "Top Coat Details":
        col_widths.append(35 * mm)

    table = Table(table_rows, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), HEADER_COLOR),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ACCENT_COLOR]),
                ("BOX", (0, 0), (-1, -1), 0.75, BORDER_COLOR),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return [
        Paragraph(title, styles["section_heading"]),
        Spacer(1, 4 * mm),
        table,
        Spacer(1, 6 * mm),
    ]


def generate_warranty_certificate(registration):
    registration = registration.__class__.objects.prefetch_related("paint_pairs__topcoat", "paint_pairs__basecoat").get(
        pk=registration.pk
    )
    paint_pairs = list(registration.paint_pairs.select_related("topcoat", "basecoat").all())
    topcoat_rows = [
        {
            "name": paint_pair.topcoat.name,
            "quantity": paint_pair.topcoat_quantity,
            "warranty_years": paint_pair.topcoat.warranty_years,
        }
        for paint_pair in paint_pairs
        if paint_pair.topcoat_id
    ]
    basecoat_rows = [
        {
            "name": paint_pair.basecoat.name,
            "quantity": paint_pair.basecoat_quantity,
        }
        for paint_pair in paint_pairs
        if paint_pair.basecoat_id and paint_pair.basecoat_quantity is not None
    ]

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
    )

    base_styles = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "CertificateTitle",
            parent=base_styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=HEADER_COLOR,
            spaceAfter=6,
        ),
        "subtitle": ParagraphStyle(
            "CertificateSubtitle",
            parent=base_styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=TEXT_COLOR,
        ),
        "section_heading": ParagraphStyle(
            "SectionHeading",
            parent=base_styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=HEADER_COLOR,
            spaceAfter=2,
        ),
        "label": ParagraphStyle(
            "InfoLabel",
            parent=base_styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=12,
            textColor=TEXT_COLOR,
        ),
        "value": ParagraphStyle(
            "InfoValue",
            parent=base_styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=12,
            textColor=TEXT_COLOR,
        ),
        "table_header": ParagraphStyle(
            "TableHeader",
            parent=base_styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=colors.white,
        ),
        "table_cell": ParagraphStyle(
            "TableCell",
            parent=base_styles["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=11,
            textColor=TEXT_COLOR,
        ),
        "footer": ParagraphStyle(
            "Footer",
            parent=base_styles["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#4B5563"),
        ),
    }

    story = [
        Paragraph("Dulux Assurance Warranty Registration Certificate", styles["title"]),
        Paragraph(
            "This certificate is generated from the approved registration details provided by the customer.",
            styles["subtitle"],
        ),
        Spacer(1, 6 * mm),
        _build_info_table(registration, styles),
        Spacer(1, 6 * mm),
    ]

    story.extend(_build_product_table("Top Coat Details", topcoat_rows, styles))

    if basecoat_rows:
        story.extend(_build_product_table("Base Coat Details", basecoat_rows, styles))

    story.extend(
        [
            Spacer(1, 4 * mm),
            Paragraph(
                "This document is system generated from Dulux.pk Assurance records and reflects the approved "
                "customer, dealer, and product details available at the time of issuance.",
                styles["footer"],
            ),
        ]
    )

    document.build(story)
    content = buffer.getvalue()
    buffer.close()
    return ContentFile(content, name=f"warranty_certificate_{registration.registration_code}.pdf")
