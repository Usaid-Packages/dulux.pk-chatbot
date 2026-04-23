import os
import re
import subprocess
import tempfile

from django.test import TestCase

from dulux_chatbot.products.choices import ProductType
from dulux_chatbot.products.tests.factories import create_product
from dulux_chatbot.warranty.services.certificate import generate_warranty_certificate
from dulux_chatbot.warranty.tests.factories import create_paint_pair, create_registration


def _render_certificate_text(certificate) -> str:
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
        temp_file.write(certificate.read())
        temp_path = temp_file.name

    try:
        return subprocess.run(
            ["strings", temp_path],
            check=True,
            capture_output=True,
            text=True,
        ).stdout
    finally:
        os.unlink(temp_path)


def _get_page_count(rendered_text: str) -> int:
    match = re.search(r"/Count\s+(\d+)", rendered_text)
    if match is None:
        return 0
    return int(match.group(1))


class WarrantyCertificateTests(TestCase):
    def test_generate_warranty_certificate_uses_single_page_when_footer_fits(self):
        registration = create_registration()
        create_paint_pair(registration=registration)

        certificate = generate_warranty_certificate(registration)
        rendered_text = _render_certificate_text(certificate)

        self.assertEqual(certificate.name, f"warranty_certificate_{registration.registration_code}.pdf")
        self.assertIn("Customer Name", rendered_text)
        self.assertIn("Mobile No.", rendered_text)
        self.assertIn("Site Address", rendered_text)
        self.assertIn("Issue Date", rendered_text)
        self.assertIn("Top Coat Details", rendered_text)
        self.assertIn("No. of Years", rendered_text)
        self.assertIn("Warranty", rendered_text)
        self.assertIn("WARRANTY REGISTRATION", rendered_text)
        self.assertIn("NO.", rendered_text)
        self.assertEqual(_get_page_count(rendered_text), 1)
        self.assertNotIn("Issuance Date", rendered_text)
        self.assertNotIn("Purchase Date", rendered_text)
        self.assertNotIn("Dealer City", rendered_text)
        self.assertNotIn("Base Coat Details", rendered_text)
        self.assertNotIn("Batch Number", rendered_text)
        self.assertNotIn("Price Paid", rendered_text)

    def test_generate_warranty_certificate_uses_second_page_when_footer_does_not_fit(self):
        registration = create_registration()
        for _ in range(2):
            topcoat = create_product(name=f"Warranty Topcoat {_}", product_type=ProductType.TOPCOAT, warranty_years=5)
            basecoat = create_product(
                name=f"Warranty Basecoat {_}", product_type=ProductType.BASECOAT, warranty_years=3
            )
            create_paint_pair(registration=registration, topcoat=topcoat, basecoat=basecoat)

        certificate = generate_warranty_certificate(registration)
        rendered_text = _render_certificate_text(certificate)

        self.assertEqual(_get_page_count(rendered_text), 2)

    def test_generate_warranty_certificate_does_not_add_footer_only_page_after_content_overflow(self):
        registration = create_registration()
        registration.site_address = " ".join(["Long customer site address for certificate layout"] * 8)
        registration.save(update_fields=["site_address"])
        create_paint_pair(registration=registration)

        certificate = generate_warranty_certificate(registration)
        rendered_text = _render_certificate_text(certificate)

        self.assertEqual(_get_page_count(rendered_text), 2)
