from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as reportlab_canvas
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


HEADER_COLOR = colors.HexColor("#153A7A")
BORDER_COLOR = colors.HexColor("#C7D2E5")
TEXT_COLOR = colors.HexColor("#222222")
MUTED_TEXT_COLOR = colors.HexColor("#4B5563")
PAGE_ONE_HEADER_IMAGE = Path(__file__).resolve().parent.parent / "assets" / "warranty_certificate_page1_header.jpg"
PAGE_TWO_FOOTER_IMAGE = Path(__file__).resolve().parent.parent / "assets" / "warranty_certificate_page2_footer.jpg"
PAGE_HORIZONTAL_MARGIN = 15 * mm
CONTENT_WIDTH = A4[0] - (2 * PAGE_HORIZONTAL_MARGIN)
HEADER_HEIGHT = 128 * mm
PAGE_TWO_FOOTER_HEIGHT = 69 * mm
FIRST_PAGE_TOP_MARGIN = 120 * mm
FIRST_PAGE_BOTTOM_MARGIN = 22 * mm


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


def _draw_footer(canvas) -> None:
    if not PAGE_TWO_FOOTER_IMAGE.exists():
        return

    page_width, _page_height = A4
    canvas.drawImage(
        str(PAGE_TWO_FOOTER_IMAGE),
        0,
        0,
        width=page_width,
        height=PAGE_TWO_FOOTER_HEIGHT,
        preserveAspectRatio=True,
        mask="auto",
    )


def _draw_first_page(canvas, _doc, *, include_footer: bool = False) -> None:
    if not PAGE_ONE_HEADER_IMAGE.exists():
        if include_footer:
            canvas.saveState()
            _draw_footer(canvas)
            canvas.restoreState()
        return

    page_width, page_height = A4
    draw_height = HEADER_HEIGHT
    canvas.saveState()
    clip_path = canvas.beginPath()
    clip_path.rect(0, page_height - draw_height, page_width, draw_height)
    canvas.clipPath(clip_path, stroke=0, fill=0)
    canvas.drawImage(
        str(PAGE_ONE_HEADER_IMAGE),
        0,
        page_height - draw_height,
        width=page_width,
        height=draw_height,
        preserveAspectRatio=True,
        mask="auto",
    )
    if include_footer:
        _draw_footer(canvas)
    canvas.restoreState()


def _draw_later_pages(canvas, _doc) -> None:
    canvas.saveState()
    _draw_footer(canvas)
    canvas.restoreState()


class WarrantyCertificateCanvas(reportlab_canvas.Canvas):
    def __init__(self, *args, include_footer_on_first_page: bool = False, **kwargs):
        self.include_footer_on_first_page = include_footer_on_first_page
        super().__init__(*args, **kwargs)

    def showPage(self):
        self._draw_page_footer()
        super().showPage()

    def _draw_page_footer(self) -> None:
        if self._pageNumber == 1 and not self.include_footer_on_first_page:
            return
        self.saveState()
        _draw_footer(self)
        self.restoreState()


def _build_customer_details(registration, styles: dict[str, ParagraphStyle]) -> list[Paragraph]:
    detail_lines = [
        f"<b>Customer Name :</b> {registration.customer_name}",
        f"<b>Mobile No. :</b> {registration.phone_number}",
        f"<b>Site Address :</b> {registration.site_address}",
        f"<b>Issue Date :</b> {timezone.localdate().strftime('%d/%m/%Y')}",
    ]
    return [Paragraph(line, styles["detail"]) for line in detail_lines]


def _build_product_table(title: str, rows: list[dict[str, str]], styles: dict[str, ParagraphStyle]) -> list:
    table_rows = [
        [
            Paragraph("<b>Sr.N<br/>o</b>", styles["table_header"]),
            Paragraph("<b>Name</b>", styles["table_header"]),
            Paragraph("<b>Quantity</b>", styles["table_header"]),
            Paragraph("<b>No. of Years<br/>Warranty</b>", styles["table_header"]),
        ]
    ]

    for index, row in enumerate(rows, start=1):
        table_rows.append(
            [
                Paragraph(str(index), styles["table_cell"]),
                Paragraph(row["name"], styles["table_cell_left"]),
                Paragraph(row["quantity"], styles["table_cell"]),
                Paragraph(row["warranty_years"], styles["table_cell"]),
            ]
        )

    table = Table(
        table_rows,
        colWidths=[18 * mm, CONTENT_WIDTH - (98 * mm), 38 * mm, 42 * mm],
        repeatRows=1,
        hAlign="LEFT",
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


def _build_registration_box(registration, styles: dict[str, ParagraphStyle]) -> list:
    table = Table(
        [
            [
                Paragraph("WARRANTY REGISTRATION NO.", styles["registration_label"]),
                Paragraph(registration.registration_code, styles["registration_value"]),
            ]
        ],
        colWidths=[94 * mm, 40 * mm],
        hAlign="LEFT",
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
    return [Spacer(1, 1 * mm), table]


def _estimate_story_height(flowables: list) -> float:
    available_width = CONTENT_WIDTH
    available_height = A4[1] - FIRST_PAGE_TOP_MARGIN - FIRST_PAGE_BOTTOM_MARGIN
    total_height = 0.0
    for flowable in flowables:
        _, flowable_height = flowable.wrap(available_width, available_height)
        total_height += flowable_height
    return total_height


def _build_product_rows(registration) -> list[dict[str, str]]:
    paint_pairs = list(registration.paint_pairs.select_related("topcoat", "basecoat").all())
    topcoat_rows: list[dict[str, str]] = []

    for paint_pair in paint_pairs:
        if paint_pair.topcoat_id:
            topcoat_rows.append(
                {
                    "name": paint_pair.topcoat.name,
                    "quantity": str(paint_pair.topcoat_quantity),
                    "warranty_years": str(paint_pair.topcoat.warranty_years),
                }
            )
    return topcoat_rows


def generate_warranty_certificate(registration):
    registration = registration.__class__.objects.prefetch_related("paint_pairs__topcoat", "paint_pairs__basecoat").get(
        pk=registration.pk
    )
    topcoat_rows = _build_product_rows(registration)
    styles = _build_story_styles()

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=FIRST_PAGE_TOP_MARGIN,
        bottomMargin=FIRST_PAGE_BOTTOM_MARGIN,
        leftMargin=PAGE_HORIZONTAL_MARGIN,
        rightMargin=PAGE_HORIZONTAL_MARGIN,
        pageCompression=0,
    )

    story = [
        Spacer(1, 8 * mm),
        *_build_customer_details(registration, styles),
        Spacer(1, 6 * mm),
    ]

    story.extend(_build_product_table("Top Coat Details", topcoat_rows, styles))

    story.extend(_build_registration_box(registration, styles))
    first_page_content_height = _estimate_story_height(story)
    first_page_height_with_footer = A4[1] - FIRST_PAGE_TOP_MARGIN - PAGE_TWO_FOOTER_HEIGHT
    include_footer_on_first_page = first_page_content_height <= first_page_height_with_footer

    if not include_footer_on_first_page:
        story.extend([PageBreak(), Spacer(1, 1 * mm)])

    def _draw_first_page_callback(canvas, doc) -> None:
        _draw_first_page(canvas, doc, include_footer=False)

    document.build(
        story,
        onFirstPage=_draw_first_page_callback,
        onLaterPages=_draw_later_pages,
        canvasmaker=lambda *args, **kwargs: WarrantyCertificateCanvas(
            *args,
            include_footer_on_first_page=include_footer_on_first_page,
            **kwargs,
        ),
    )
    content = buffer.getvalue()
    buffer.close()
    return ContentFile(content, name=f"warranty_certificate_{registration.registration_code}.pdf")
