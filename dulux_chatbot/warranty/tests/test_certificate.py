import os
import subprocess
import tempfile

from django.test import TestCase

from dulux_chatbot.products.choices import ProductType
from dulux_chatbot.products.tests.factories import create_product
from dulux_chatbot.warranty.services.certificate import generate_warranty_certificate
from dulux_chatbot.warranty.tests.factories import create_paint_pair, create_registration


class WarrantyCertificateTests(TestCase):
    def test_generate_warranty_certificate_uses_single_page_when_footer_fits(self):
        registration = create_registration()
        create_paint_pair(registration=registration)

        certificate = generate_warranty_certificate(registration)
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
            temp_file.write(certificate.read())
            temp_path = temp_file.name

        try:
            rendered_text = subprocess.run(
                ["strings", temp_path],
                check=True,
                capture_output=True,
                text=True,
            ).stdout
        finally:
            os.unlink(temp_path)

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
        self.assertIn("/Count 1", rendered_text)
        self.assertNotIn("Issuance Date", rendered_text)
        self.assertNotIn("Purchase Date", rendered_text)
        self.assertNotIn("Dealer City", rendered_text)
        self.assertNotIn("Base Coat Details", rendered_text)
        self.assertNotIn("Batch Number", rendered_text)
        self.assertNotIn("Price Paid", rendered_text)

    def test_generate_warranty_certificate_uses_second_page_when_footer_does_not_fit(self):
        registration = create_registration()
        for _ in range(12):
            topcoat = create_product(name=f"Warranty Topcoat {_}", product_type=ProductType.TOPCOAT, warranty_years=5)
            basecoat = create_product(
                name=f"Warranty Basecoat {_}", product_type=ProductType.BASECOAT, warranty_years=3
            )
            create_paint_pair(registration=registration, topcoat=topcoat, basecoat=basecoat)

        certificate = generate_warranty_certificate(registration)
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
            temp_file.write(certificate.read())
            temp_path = temp_file.name

        try:
            rendered_text = subprocess.run(
                ["strings", temp_path],
                check=True,
                capture_output=True,
                text=True,
            ).stdout
        finally:
            os.unlink(temp_path)

        self.assertGreaterEqual(rendered_text.count("/Type /Page"), 2)
