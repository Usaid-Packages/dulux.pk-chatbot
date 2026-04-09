from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


HEADER_COLOR = colors.HexColor("#153A7A")
BORDER_COLOR = colors.HexColor("#C7D2E5")
TEXT_COLOR = colors.HexColor("#222222")
MUTED_TEXT_COLOR = colors.HexColor("#4B5563")
PAGE_ONE_HEADER_IMAGE = Path(__file__).resolve().parent.parent / "assets" / "warranty_certificate_page1_header.jpg"
PAGE_TWO_FOOTER_IMAGE = Path(__file__).resolve().parent.parent / "assets" / "warranty_certificate_page2_footer.jpg"
HEADER_HEIGHT = 122 * mm
PAGE_TWO_FOOTER_HEIGHT = 48 * mm


def _build_story_styles() -> dict[str, ParagraphStyle]:
    base_styles = getSampleStyleSheet()
    return {
        "detail": ParagraphStyle(
            "CertificateDetail",
            parent=base_styles["BodyText"],
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            textColor=TEXT_COLOR,
            spaceAfter=3,
        ),
        "section_heading": ParagraphStyle(
            "CertificateSectionHeading",
            parent=base_styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=18,
            textColor=TEXT_COLOR,
            spaceAfter=2,
        ),
        "table_header": ParagraphStyle(
            "CertificateTableHeader",
            parent=base_styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=12,
            textColor=colors.white,
            alignment=1,
        ),
        "table_cell": ParagraphStyle(
            "CertificateTableCell",
            parent=base_styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=12,
            textColor=MUTED_TEXT_COLOR,
            alignment=1,
        ),
        "table_cell_left": ParagraphStyle(
            "CertificateTableCellLeft",
            parent=base_styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=12,
            textColor=MUTED_TEXT_COLOR,
            alignment=0,
        ),
        "registration_label": ParagraphStyle(
            "RegistrationLabel",
            parent=base_styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=14,
            textColor=colors.white,
        ),
        "registration_value": ParagraphStyle(
            "RegistrationValue",
            parent=base_styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=14,
            textColor=TEXT_COLOR,
            alignment=1,
        ),
    }


def _draw_first_page(canvas, _doc) -> None:
    if not PAGE_ONE_HEADER_IMAGE.exists():
        return

    page_width, page_height = A4
    canvas.saveState()
    clip_path = canvas.beginPath()
    clip_path.rect(0, page_height - HEADER_HEIGHT, page_width, HEADER_HEIGHT)
    canvas.clipPath(clip_path, stroke=0, fill=0)
    canvas.drawImage(
        str(PAGE_ONE_HEADER_IMAGE),
        0,
        0,
        width=page_width,
        height=page_height,
        preserveAspectRatio=False,
        mask="auto",
    )
    canvas.restoreState()


def _draw_later_pages(canvas, _doc) -> None:
    if not PAGE_TWO_FOOTER_IMAGE.exists():
        return

    page_width, _page_height = A4
    canvas.saveState()
    canvas.drawImage(
        str(PAGE_TWO_FOOTER_IMAGE),
        0,
        0,
        width=page_width,
        height=PAGE_TWO_FOOTER_HEIGHT,
        preserveAspectRatio=False,
        mask="auto",
    )
    canvas.restoreState()


def _build_customer_details(registration, styles: dict[str, ParagraphStyle]) -> list[Paragraph]:
    detail_lines = [
        f"<b>Customer Name :</b> {registration.customer_name}",
        f"<b>Mobile No. :</b> {registration.phone_number}",
        f"<b>Site Address :</b> {registration.site_address}",
        f"<b>Purchase Date :</b> {registration.purchase_date.strftime('%d/%m/%Y')}",
    ]
    return [Paragraph(line, styles["detail"]) for line in detail_lines]


def _build_product_table(title: str, rows: list[dict[str, str]], styles: dict[str, ParagraphStyle]) -> list:
    table_rows = [
        [
            Paragraph("<b>Sr.N<br/>o</b>", styles["table_header"]),
            Paragraph("<b>Name</b>", styles["table_header"]),
            Paragraph("<b>Quantity</b>", styles["table_header"]),
        ]
    ]

    for index, row in enumerate(rows, start=1):
        table_rows.append(
            [
                Paragraph(str(index), styles["table_cell"]),
                Paragraph(row["name"], styles["table_cell_left"]),
                Paragraph(row["quantity"], styles["table_cell"]),
            ]
        )

    table = Table(
        table_rows,
        colWidths=[14 * mm, 82 * mm, 42 * mm],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), HEADER_COLOR),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.75, BORDER_COLOR),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
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


def _build_registration_box(registration, styles: dict[str, ParagraphStyle]) -> KeepTogether:
    table = Table(
        [
            [
                Paragraph("WARRANTY REGISTRATION NO.", styles["registration_label"]),
                Paragraph(registration.registration_code, styles["registration_value"]),
            ]
        ],
        colWidths=[68 * mm, 28 * mm],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), HEADER_COLOR),
                ("BACKGROUND", (1, 0), (1, 0), colors.white),
                ("BOX", (0, 0), (-1, -1), 1, HEADER_COLOR),
                ("INNERGRID", (0, 0), (-1, -1), 1, HEADER_COLOR),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    return KeepTogether([Spacer(1, 1 * mm), table])


def _build_product_rows(registration) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    paint_pairs = list(registration.paint_pairs.select_related("topcoat", "basecoat").all())
    topcoat_rows: list[dict[str, str]] = []
    basecoat_rows: list[dict[str, str]] = []

    for paint_pair in paint_pairs:
        if paint_pair.topcoat_id:
            topcoat_rows.append(
                {
                    "name": paint_pair.topcoat.name,
                    "quantity": str(paint_pair.topcoat_quantity),
                }
            )

        if paint_pair.basecoat_id and paint_pair.basecoat_quantity is not None:
            basecoat_rows.append(
                {
                    "name": paint_pair.basecoat.name,
                    "quantity": str(paint_pair.basecoat_quantity),
                }
            )

    return topcoat_rows, basecoat_rows


def generate_warranty_certificate(registration):
    registration = registration.__class__.objects.prefetch_related("paint_pairs__topcoat", "paint_pairs__basecoat").get(
        pk=registration.pk
    )
    topcoat_rows, basecoat_rows = _build_product_rows(registration)
    styles = _build_story_styles()

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=120 * mm,
        bottomMargin=22 * mm,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        pageCompression=0,
    )

    story = [
        Spacer(1, 2 * mm),
        *_build_customer_details(registration, styles),
        Spacer(1, 6 * mm),
    ]

    story.extend(_build_product_table("Top Coat Details", topcoat_rows, styles))

    if basecoat_rows:
        story.extend(_build_product_table("Base Coat Details", basecoat_rows, styles))

    story.append(_build_registration_box(registration, styles))
    story.extend([PageBreak(), Spacer(1, 1 * mm)])

    document.build(story, onFirstPage=_draw_first_page, onLaterPages=_draw_later_pages)
    content = buffer.getvalue()
    buffer.close()
    return ContentFile(content, name=f"warranty_certificate_{registration.registration_code}.pdf")
