from __future__ import annotations

import tempfile

from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from dulux_chatbot.products.choices import ProductType
from dulux_chatbot.products.models import Product


try:
    from openpyxl import Workbook
except ImportError as exc:  # pragma: no cover
    raise ImportError("openpyxl is required for XLSX import tests.") from exc


class ProductXlsxImportTests(TestCase):
    def _write_workbook(self, rows: list[list[object]]) -> str:
        workbook = Workbook()
        worksheet = workbook.active
        for row in rows:
            worksheet.append(row)
        tmp = tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False)
        tmp.close()
        workbook.save(tmp.name)
        return tmp.name

    def test_import_creates_and_updates_products_and_skips_missing_url(self):
        # Header mapping is intentionally loose: the importer normalizes these keys.
        xlsx_path = self._write_workbook(
            [
                ["Name", "Product Type", "Warranty Years", "Features", "Coverage Details", "Website URL", "Active"],
                ["Dulux Alpha", "TOPCOAT", 5, "New features", "New coverage", "https://example.com/a", "yes"],
                ["Dulux Skip", "TOPCOAT", 1, "Skip", "Skip", "", "yes"],  # missing URL -> skipped
                ["Dulux Alpha", "Other", 6, "Updated features", "Updated coverage", "https://example.com/a2", "no"],
                ["Dulux Base", "BASE", 3, "Base features", "Base coverage", "https://example.com/b", "1"],
            ]
        )

        stdout = StringIO()
        call_command("import_products_xlsx", xlsx_path, stdout=stdout)

        alpha = Product.objects.get(name="Dulux Alpha")
        self.assertEqual(alpha.product_type, ProductType.TOPCOAT)
        self.assertEqual(alpha.warranty_years, 6)
        self.assertEqual(alpha.webpage_url, "https://example.com/a2")
        self.assertFalse(alpha.is_active)

        base = Product.objects.get(name="Dulux Base")
        self.assertEqual(base.product_type, ProductType.BASECOAT)
        self.assertEqual(base.warranty_years, 3)

        self.assertFalse(Product.objects.filter(name="Dulux Skip").exists())

    def test_unknown_type_is_treated_as_topcoat(self):
        xlsx_path = self._write_workbook(
            [
                ["product_name", "type", "warranty", "features", "coverage", "url"],
                ["Mystery Coat", "SomethingElse", 2, "F", "C", "https://example.com/m"],
            ]
        )
        call_command("import_products_xlsx", xlsx_path)
        product = Product.objects.get(name="Mystery Coat")
        self.assertEqual(product.product_type, ProductType.TOPCOAT)
