import csv
import json
import re

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

import requests

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import transaction
from django.utils import timezone

from dulux_chatbot.core.models import Image
from dulux_chatbot.products.choices import ProductType
from dulux_chatbot.products.models import Product, ProductBasecoat
from dulux_chatbot.users.choices import UserRole
from dulux_chatbot.warranty.choices import InvoiceType, RegistrationChannel, RegistrationState
from dulux_chatbot.warranty.models import PaintPairInvoice, RegistrationPaintPair, WarrantyRegistration
from dulux_chatbot.warranty.services.certificate import generate_warranty_certificate


HISTORICAL_APPROVER_EMAIL = "duluxhistoricaldata@gmail.com"
STATE_MAP = {
    "REG_IN_PROGRESS": RegistrationState.IN_PROGRESS,
    "REG_SUBMITTED": RegistrationState.SUBMITTED,
    "REG_APPROVED": RegistrationState.APPROVED,
    "REG_RESUBMIT": RegistrationState.RESUBMIT,
    "REG_REJECTED": RegistrationState.REJECTED,
}
CHANNEL_MAP = {
    "whatsapp": RegistrationChannel.WHATSAPP,
    "directline": RegistrationChannel.WEBFORM,
    "web": RegistrationChannel.WEB,
    "webform": RegistrationChannel.WEBFORM,
}
INVOICE_ATTACHMENT_FIELDS = (
    ("topcoatInvoiceAttachments", InvoiceType.TOPCOAT),
    ("basecoatInvoiceAttachments", InvoiceType.BASECOAT),
)
PRODUCT_QUANTITY_PATTERN = re.compile(r"\((?P<liters>\d+(?:\.\d+)?)\s*l\)", re.IGNORECASE)
IMPORTED_PRODUCT_FEATURES = "Imported historical product"
IMPORTED_PRODUCT_COVERAGE_DETAILS = "Imported from historical warranty registration data."
IMPORTED_PRODUCT_WEBPAGE_URL = "https://www.dulux.com.pk/"
IMPORTED_PRODUCT_WARRANTY_YEARS = 1


@dataclass(frozen=True)
class PaintPairData:
    topcoat: Product
    topcoat_quantity: Decimal
    basecoat: Product | None
    basecoat_quantity: Decimal | None


class Command(BaseCommand):
    help = "Import historical warranty registrations from the legacy CSV export."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("csv_path", type=str, help="Path to the historical warranty registrations CSV file.")
        parser.add_argument("--batch-size", type=int, default=100, help="Rows to import per transaction.")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and validate without writing to the database.",
        )
        parser.add_argument(
            "--download-invoices",
            action="store_true",
            help="Download invoice attachment URLs and create PaintPairInvoice records.",
        )
        parser.add_argument(
            "--allow-empty-products",
            action="store_true",
            help="Deprecated. Registrations without product rows are imported by default.",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        csv_path = Path(options["csv_path"]).expanduser()
        if not csv_path.exists():
            raise CommandError(f"CSV file does not exist: {csv_path}")
        if options["batch_size"] <= 0:
            raise CommandError("--batch-size must be greater than 0.")

        self.created_product_count = 0
        product_lookup = self._build_product_lookup()
        rows = self._read_rows(csv_path)
        stats = {
            "created": 0,
            "products": 0,
            "skipped": 0,
            "invoices": 0,
            "certificates": 0,
        }
        skipped_rows: list[str] = []

        for batch_start in range(0, len(rows), options["batch_size"]):
            batch = rows[batch_start : batch_start + options["batch_size"]]
            with transaction.atomic():
                for row_index, row in enumerate(batch, start=batch_start + 2):
                    try:
                        created, invoice_count, certificate_count = self._import_row(
                            row=row,
                            row_index=row_index,
                            product_lookup=product_lookup,
                            dry_run=options["dry_run"],
                            download_invoices=options["download_invoices"],
                        )
                    except ValueError as exc:
                        stats["skipped"] += 1
                        skipped_rows.append(f"row {row_index}: {exc}")
                        continue

                    if created:
                        stats["created"] += 1
                        stats["invoices"] += invoice_count
                        stats["certificates"] += certificate_count

                if options["dry_run"]:
                    transaction.set_rollback(True)

        stats["products"] = self.created_product_count
        self.stdout.write(self.style.SUCCESS(f"Rows parsed: {len(rows)}"))
        self.stdout.write(self.style.SUCCESS(f"Registrations created: {stats['created']}"))
        self.stdout.write(self.style.SUCCESS(f"Products created: {stats['products']}"))
        self.stdout.write(self.style.SUCCESS(f"Rows skipped: {stats['skipped']}"))
        self.stdout.write(self.style.SUCCESS(f"Invoices created: {stats['invoices']}"))
        self.stdout.write(self.style.SUCCESS(f"Certificates generated: {stats['certificates']}"))
        if skipped_rows:
            self.stdout.write(self.style.WARNING("Skipped row details:"))
            for skipped_row in skipped_rows[:50]:
                self.stdout.write(self.style.WARNING(f"- {skipped_row}"))
            if len(skipped_rows) > 50:
                self.stdout.write(self.style.WARNING(f"... and {len(skipped_rows) - 50} more skipped rows."))

    def _read_rows(self, csv_path: Path) -> list[dict[str, str]]:
        with csv_path.open(newline="", encoding="utf-8-sig") as csv_file:
            return list(csv.DictReader(csv_file))

    def _build_product_lookup(self) -> dict[tuple[str, str], Product]:
        products = Product.objects.all()
        return {(product.name.strip().casefold(), product.product_type): product for product in products}

    def _import_row(
        self,
        *,
        row: dict[str, str],
        row_index: int,
        product_lookup: dict[tuple[str, str], Product],
        dry_run: bool,
        download_invoices: bool,
    ) -> tuple[bool, int, int]:
        legacy_code = self._required(row, "registrationCode", row_index=row_index)
        if len(legacy_code) > 10:
            raise ValueError(f"registrationCode exceeds 10 characters: {legacy_code}")

        if WarrantyRegistration.objects.filter(registration_code=legacy_code).exists():
            return False, 0, 0

        paint_pairs = self._build_paint_pairs(row=row, product_lookup=product_lookup)
        state = self._map_state(row.get("state", ""))

        if dry_run:
            return True, 0, int(state == RegistrationState.APPROVED)

        registration = WarrantyRegistration.objects.create(
            registration_code=legacy_code,
            channel=self._map_channel(row.get("channel", "")),
            state=state,
            customer_name=self._required(row, "customerName", row_index=row_index),
            phone_number=self._required(row, "phoneNumber", row_index=row_index),
            email=self._required(row, "email", row_index=row_index),
            city=self._required(row, "customerCity", row_index=row_index),
            province="",
            site_address=self._required(row, "siteAddress", row_index=row_index),
            purchase_date=self._parse_date(self._required(row, "purchaseDate", row_index=row_index)),
            purchase_dealer=str(row.get("purchaseDealer") or "").strip(),
            purchase_dealer_city=str(row.get("customerCity") or "").strip(),
            purchase_dealer_address=str(row.get("purchaseDealerAddress") or "").strip(),
            postal_code="",
            notes=self._build_notes(row=row, legacy_code=legacy_code),
            approved_by=self._get_historical_approver() if state == RegistrationState.APPROVED else None,
            approved_at=self._parse_timestamp_ms(row.get("viewedByAgentTimestamp", ""))
            if state == RegistrationState.APPROVED
            else None,
        )

        for paint_pair in paint_pairs:
            RegistrationPaintPair.objects.create(
                registration=registration,
                topcoat=paint_pair.topcoat,
                topcoat_quantity=paint_pair.topcoat_quantity,
                basecoat=paint_pair.basecoat,
                basecoat_quantity=paint_pair.basecoat_quantity,
            )

        invoice_count = 0
        if download_invoices:
            invoice_count = self._import_invoices(row=row, registration=registration)

        certificate_count = self._generate_certificate_if_approved(registration=registration)
        self._apply_historical_timestamps(registration=registration, row=row)
        return True, invoice_count, certificate_count

    def _build_paint_pairs(
        self,
        *,
        row: dict[str, str],
        product_lookup: dict[tuple[str, str], Product],
    ) -> list[PaintPairData]:
        topcoat_items = self._json_list(row.get("topCoats", ""))
        basecoat_items = self._json_list(row.get("baseCoats", ""))
        paint_pairs = []

        for index, topcoat_item in enumerate(topcoat_items):
            topcoat_name = str(topcoat_item.get("topcoat") or "").strip()
            if not topcoat_name:
                continue
            topcoat = self._get_or_create_product(
                name=topcoat_name,
                product_type=ProductType.TOPCOAT,
                product_lookup=product_lookup,
            )

            basecoat = None
            basecoat_quantity = None
            if index < len(basecoat_items):
                basecoat_item = basecoat_items[index]
                basecoat_name = str(basecoat_item.get("basecoat") or "").strip()
                if basecoat_name:
                    basecoat = self._get_or_create_product(
                        name=basecoat_name,
                        product_type=ProductType.BASECOAT,
                        product_lookup=product_lookup,
                    )
                if basecoat is not None:
                    ProductBasecoat.objects.get_or_create(topcoat=topcoat, basecoat=basecoat)
                    basecoat_quantity = self._extract_quantity(
                        value=basecoat_item.get("basecoatQuantity"),
                        label=basecoat_item.get("basecoatPrimerQuantity"),
                    )

            paint_pairs.append(
                PaintPairData(
                    topcoat=topcoat,
                    topcoat_quantity=self._extract_quantity(
                        value=topcoat_item.get("topcoatQuantity"),
                        label=topcoat_item.get("topcoatPaintQuantity"),
                    ),
                    basecoat=basecoat,
                    basecoat_quantity=basecoat_quantity,
                )
            )

        return paint_pairs

    def _get_or_create_product(
        self,
        *,
        name: str,
        product_type: str,
        product_lookup: dict[tuple[str, str], Product],
    ) -> Product:
        lookup_key = (name.strip().casefold(), product_type)
        product = product_lookup.get(lookup_key)
        if product is not None:
            return product

        product, _created = Product.objects.get_or_create(
            name=name.strip(),
            product_type=product_type,
            defaults={
                "warranty_years": IMPORTED_PRODUCT_WARRANTY_YEARS,
                "features": IMPORTED_PRODUCT_FEATURES,
                "coverage_details": IMPORTED_PRODUCT_COVERAGE_DETAILS,
                "webpage_url": IMPORTED_PRODUCT_WEBPAGE_URL,
                "is_active": True,
            },
        )
        if _created:
            self.created_product_count += 1
        product_lookup[lookup_key] = product
        return product

    def _import_invoices(self, *, row: dict[str, str], registration: WarrantyRegistration) -> int:
        created_count = 0
        for csv_field, invoice_type in INVOICE_ATTACHMENT_FIELDS:
            for attachment in self._json_list(row.get(csv_field, "")):
                image = self._download_invoice_image(attachment=attachment)
                if image is None:
                    continue
                PaintPairInvoice.objects.create(registration=registration, image=image, invoice_type=invoice_type)
                created_count += 1
        return created_count

    def _download_invoice_image(self, *, attachment: dict[str, Any]) -> Image | None:
        for url_key in ("contentUrl", "sidContentUrl", "oldContentUrl"):
            url = str(attachment.get(url_key) or "").strip()
            if not url:
                continue
            try:
                response = requests.get(url, timeout=20)
                response.raise_for_status()
            except requests.RequestException:
                continue
            filename = str(attachment.get("name") or attachment.get("originalName") or "historical_invoice.jpeg")
            return Image.objects.create(image=ContentFile(response.content, name=filename))
        return None

    def _get_historical_approver(self):
        user_model = get_user_model()
        try:
            return user_model.objects.get(email=HISTORICAL_APPROVER_EMAIL)
        except user_model.DoesNotExist:
            return user_model.objects.create_user(
                email=HISTORICAL_APPROVER_EMAIL,
                password=None,
                role=UserRole.ADMIN,
                first_name="Dulux",
                last_name="Historical Data",
                is_active=True,
            )

    def _generate_certificate_if_approved(self, *, registration: WarrantyRegistration) -> int:
        if registration.state != RegistrationState.APPROVED or registration.warranty_certificate:
            return 0

        content = generate_warranty_certificate(registration)
        registration.warranty_certificate.save(content.name, content, save=True)
        return 1

    def _apply_historical_timestamps(self, *, registration: WarrantyRegistration, row: dict[str, str]) -> None:
        created = self._parse_timestamp_ms(row.get("createdOn", ""))
        modified = self._parse_timestamp_ms(row.get("timestamp", ""))
        update_fields = []
        if created is not None:
            registration.created = created
            update_fields.append("created")
        if modified is not None:
            registration.modified = modified
            update_fields.append("modified")
        if update_fields:
            registration.save(update_fields=update_fields)

    def _build_notes(self, *, row: dict[str, str], legacy_code: str) -> str:
        notes = [
            f"Legacy registration code: {legacy_code}",
            f"Legacy id: {row.get('id', '').strip()}",
            f"Legacy state: {row.get('state', '').strip()}",
        ]
        resubmit_reason = row.get("resubmitReason", "").strip()
        reject_reason = row.get("rejectReason", "").strip()
        if resubmit_reason and resubmit_reason != "[]":
            notes.append(f"Legacy resubmit reason: {resubmit_reason}")
        if reject_reason and reject_reason != "[]":
            notes.append(f"Legacy reject reason: {reject_reason}")
        return "\n".join(note for note in notes if note)

    def _map_state(self, value: str) -> str:
        return STATE_MAP.get(str(value or "").strip(), RegistrationState.SUBMITTED)

    def _map_channel(self, value: str) -> str:
        return CHANNEL_MAP.get(str(value or "").strip().casefold(), RegistrationChannel.WEBFORM)

    def _extract_quantity(self, *, value: Any, label: Any) -> Decimal:
        parsed_value = self._decimal_or_none(value)
        if parsed_value is not None and parsed_value > 0:
            return parsed_value

        match = PRODUCT_QUANTITY_PATTERN.search(str(label or ""))
        if match:
            return Decimal(match.group("liters"))
        return Decimal("0.00")

    def _parse_date(self, value: str):
        for date_format in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d"):
            try:
                return datetime.strptime(value, date_format).date()
            except ValueError:
                continue
        raise ValueError(f"Invalid purchaseDate: {value}")

    def _parse_timestamp_ms(self, value: str):
        try:
            timestamp_ms = int(float(str(value or "").strip()))
        except ValueError:
            return None
        return datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.get_current_timezone())

    def _json_list(self, value: str) -> list[dict[str, Any]]:
        if not value or not value.strip():
            return []
        try:
            parsed_value = json.loads(value)
        except json.JSONDecodeError:
            return []
        if not isinstance(parsed_value, list):
            return []
        return [item for item in parsed_value if isinstance(item, dict)]

    def _decimal_or_none(self, value: Any) -> Decimal | None:
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            return None

    def _required(self, row: dict[str, str], field_name: str, *, row_index: int) -> str:
        value = str(row.get(field_name) or "").strip()
        if not value:
            raise ValueError(f"Missing required CSV field {field_name}.")
        return value
