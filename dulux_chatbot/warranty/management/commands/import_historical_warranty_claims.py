import csv
import json

from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

import requests

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import transaction
from django.utils import timezone

from dulux_chatbot.core.models import Image
from dulux_chatbot.products.choices import ProductType
from dulux_chatbot.products.models import Product
from dulux_chatbot.warranty.choices import ClaimState, IssueType, PhotoType
from dulux_chatbot.warranty.models import ClaimImage, RegistrationPaintPair, WarrantyClaim, WarrantyRegistration


CLAIM_STATE_MAP = {
    "SUBMITTED": ClaimState.SUBMITTED,
    "IN_REVIEW": ClaimState.IN_REVIEW,
    "QA_REVIEW": ClaimState.QA_REVIEW,
    "QA_APPROVED": ClaimState.QA_APPROVED,
    "QA_REJECTED": ClaimState.QA_REJECTED,
    "APPROVED": ClaimState.APPROVED,
    "REJECTED": ClaimState.REJECTED,
    "RESUBMIT": ClaimState.RESUBMIT,
}
ISSUE_TYPE_MAP = {
    "peeling or cracking": IssueType.PEELING_CRACKING,
    "color fading or flawed color": IssueType.COLOR_FADING,
    "algae and fungus growth": IssueType.ALGAE_FUNGUS,
    "water ingress": IssueType.WATER_INGRESS,
    "coverage variance": IssueType.COVERAGE_VARIANCE,
    "non-uniform finish or patchy finish": IssueType.NON_UNIFORM_FINISH,
}
PHOTO_TYPES = (PhotoType.LONG_SHOT, PhotoType.CLOSE_SHOT, PhotoType.ALTERNATE_ANGLE)
IMPORTED_PRODUCT_FEATURES = "Imported historical product"
IMPORTED_PRODUCT_COVERAGE_DETAILS = "Imported from historical warranty claim data."
IMPORTED_PRODUCT_WEBPAGE_URL = "https://www.dulux.com.pk/"
IMPORTED_PRODUCT_WARRANTY_YEARS = 1


class Command(BaseCommand):
    help = "Import historical warranty claims from the legacy CSV export."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("csv_path", type=str, help="Path to the historical warranty claims CSV file.")
        parser.add_argument("--batch-size", type=int, default=100, help="Rows to import per transaction.")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and validate without writing to the database.",
        )
        parser.add_argument(
            "--download-attachments",
            action="store_true",
            help="Download image attachments and create ClaimImage records.",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        csv_path = Path(options["csv_path"]).expanduser()
        if not csv_path.exists():
            raise CommandError(f"CSV file does not exist: {csv_path}")
        if options["batch_size"] <= 0:
            raise CommandError("--batch-size must be greater than 0.")

        rows = self._read_rows(csv_path)
        product_lookup = self._build_product_lookup()
        self.created_product_count = 0
        self.created_paint_pair_count = 0
        stats = {
            "created": 0,
            "skipped": 0,
            "attachments": 0,
            "non_image_attachments": 0,
        }
        skipped_rows: list[str] = []

        for batch_start in range(0, len(rows), options["batch_size"]):
            batch = rows[batch_start : batch_start + options["batch_size"]]
            with transaction.atomic():
                for row_index, row in enumerate(batch, start=batch_start + 2):
                    try:
                        created, attachment_count, non_image_count = self._import_row(
                            row=row,
                            row_index=row_index,
                            product_lookup=product_lookup,
                            dry_run=options["dry_run"],
                            download_attachments=options["download_attachments"],
                        )
                    except ValueError as exc:
                        stats["skipped"] += 1
                        skipped_rows.append(f"row {row_index}: {exc}")
                        continue

                    if created:
                        stats["created"] += 1
                        stats["attachments"] += attachment_count
                        stats["non_image_attachments"] += non_image_count

                if options["dry_run"]:
                    transaction.set_rollback(True)

        self.stdout.write(self.style.SUCCESS(f"Rows parsed: {len(rows)}"))
        self.stdout.write(self.style.SUCCESS(f"Claims created: {stats['created']}"))
        self.stdout.write(self.style.SUCCESS(f"Products created: {self.created_product_count}"))
        self.stdout.write(self.style.SUCCESS(f"Paint pairs created: {self.created_paint_pair_count}"))
        self.stdout.write(self.style.SUCCESS(f"Claim images created: {stats['attachments']}"))
        self.stdout.write(self.style.SUCCESS(f"Non-image attachments skipped: {stats['non_image_attachments']}"))
        self.stdout.write(self.style.SUCCESS(f"Rows skipped: {stats['skipped']}"))
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
        download_attachments: bool,
    ) -> tuple[bool, int, int]:
        legacy_claim_id = self._required(row, "id", row_index=row_index)
        if WarrantyClaim.objects.filter(notes__contains=f"Legacy claim id: {legacy_claim_id}").exists():
            return False, 0, 0

        registration = self._get_registration(row=row, row_index=row_index)
        paint_pair = self._get_or_create_paint_pair(
            registration=registration,
            topcoat_name=str(row.get("topcoat") or "").strip(),
            product_lookup=product_lookup,
            dry_run=dry_run,
        )
        issue_type = self._map_issue_type(row=row)
        state = self._map_state(row.get("state", ""))
        affected_area_sqft = self._parse_decimal(row.get("affectedAreaInSqft", "")) or Decimal("0.00")
        attachments = self._json_list(row.get("affectedAreaAttachments", ""))
        non_image_count = self._count_non_image_attachments(attachments)

        if dry_run:
            return True, 0, non_image_count

        claim = WarrantyClaim.objects.create(
            registration=registration,
            paint_pair=paint_pair,
            issue_type=issue_type,
            affected_area_sqft=affected_area_sqft,
            state=state,
            notes=self._build_notes(row=row, legacy_claim_id=legacy_claim_id, issue_type=issue_type),
            approved_at=self._parse_timestamp_ms(row.get("approvalInfoUpdatedAt", "")),
        )
        self._apply_historical_timestamps(claim=claim, row=row)

        attachment_count = 0
        if download_attachments:
            attachment_count = self._import_claim_images(claim=claim, attachments=attachments)

        return True, attachment_count, non_image_count

    def _get_registration(self, *, row: dict[str, str], row_index: int) -> WarrantyRegistration:
        registration_code = self._required(row, "registrationCode", row_index=row_index)
        try:
            return WarrantyRegistration.objects.prefetch_related("paint_pairs__topcoat").get(
                registration_code=registration_code
            )
        except WarrantyRegistration.DoesNotExist as exc:
            raise ValueError(f"Registration not found for registrationCode {registration_code}.") from exc

    def _get_or_create_paint_pair(
        self,
        *,
        registration: WarrantyRegistration,
        topcoat_name: str,
        product_lookup: dict[tuple[str, str], Product],
        dry_run: bool,
    ) -> RegistrationPaintPair:
        matching_paint_pair = next(
            (
                paint_pair
                for paint_pair in registration.paint_pairs.all()
                if paint_pair.topcoat.name.strip().casefold() == topcoat_name.casefold()
            ),
            None,
        )
        if matching_paint_pair is not None:
            return matching_paint_pair

        if not topcoat_name:
            paint_pairs = list(registration.paint_pairs.all())
            if len(paint_pairs) == 1:
                return paint_pairs[0]
            raise ValueError(f"Could not resolve paint pair for registration {registration.registration_code}.")

        topcoat = self._get_or_create_product(
            name=topcoat_name,
            product_lookup=product_lookup,
            dry_run=dry_run,
        )
        if dry_run:
            self.created_paint_pair_count += 1
            return RegistrationPaintPair(
                registration=registration,
                topcoat=topcoat,
                topcoat_quantity=Decimal("0.00"),
            )

        paint_pair = RegistrationPaintPair.objects.create(
            registration=registration,
            topcoat=topcoat,
            topcoat_quantity=Decimal("0.00"),
        )
        self.created_paint_pair_count += 1
        return paint_pair

    def _get_or_create_product(
        self,
        *,
        name: str,
        product_lookup: dict[tuple[str, str], Product],
        dry_run: bool,
    ) -> Product:
        lookup_key = (name.strip().casefold(), ProductType.TOPCOAT)
        product = product_lookup.get(lookup_key)
        if product is not None:
            return product

        if dry_run:
            product = Product(
                name=name.strip(),
                product_type=ProductType.TOPCOAT,
                warranty_years=IMPORTED_PRODUCT_WARRANTY_YEARS,
                features=IMPORTED_PRODUCT_FEATURES,
                coverage_details=IMPORTED_PRODUCT_COVERAGE_DETAILS,
                webpage_url=IMPORTED_PRODUCT_WEBPAGE_URL,
                is_active=True,
            )
            product_lookup[lookup_key] = product
            self.created_product_count += 1
            return product

        product, created = Product.objects.get_or_create(
            name=name.strip(),
            product_type=ProductType.TOPCOAT,
            defaults={
                "warranty_years": IMPORTED_PRODUCT_WARRANTY_YEARS,
                "features": IMPORTED_PRODUCT_FEATURES,
                "coverage_details": IMPORTED_PRODUCT_COVERAGE_DETAILS,
                "webpage_url": IMPORTED_PRODUCT_WEBPAGE_URL,
                "is_active": True,
            },
        )
        if created:
            self.created_product_count += 1
        product_lookup[lookup_key] = product
        return product

    def _import_claim_images(self, *, claim: WarrantyClaim, attachments: list[dict[str, Any]]) -> int:
        created_count = 0
        image_attachments = [attachment for attachment in attachments if self._is_image_attachment(attachment)]
        for photo_type, attachment in zip(PHOTO_TYPES, image_attachments):
            image = self._download_image(attachment=attachment)
            if image is None:
                continue
            ClaimImage.objects.create(claim=claim, image=image, photo_type=photo_type)
            created_count += 1
        return created_count

    def _download_image(self, *, attachment: dict[str, Any]) -> Image | None:
        for url_key in ("contentUrl", "sidContentUrl", "oldContentUrl"):
            url = str(attachment.get(url_key) or "").strip()
            if not url:
                continue
            try:
                response = requests.get(url, timeout=20)
                response.raise_for_status()
            except requests.RequestException:
                continue
            filename = Path(
                str(attachment.get("name") or attachment.get("originalName") or "historical_claim.jpeg")
            ).name
            return Image.objects.create(image=ContentFile(response.content, name=filename))
        return None

    def _apply_historical_timestamps(self, *, claim: WarrantyClaim, row: dict[str, str]) -> None:
        created = self._parse_timestamp_ms(row.get("createdOn", ""))
        modified = self._parse_timestamp_ms(row.get("timestamp", ""))
        update_fields = []
        if created is not None:
            claim.created = created
            claim.claim_date = created.date()
            update_fields.extend(["created", "claim_date"])
        if modified is not None:
            claim.modified = modified
            update_fields.append("modified")
        if update_fields:
            claim.save(update_fields=update_fields)

    def _build_notes(self, *, row: dict[str, str], legacy_claim_id: str, issue_type: str) -> str:
        attachments = self._json_list(row.get("affectedAreaAttachments", ""))
        attachment_urls = [
            str(attachment.get("contentUrl") or attachment.get("sidContentUrl") or "").strip()
            for attachment in attachments
            if str(attachment.get("contentUrl") or attachment.get("sidContentUrl") or "").strip()
        ]
        notes = [
            f"Legacy claim id: {legacy_claim_id}",
            f"Legacy registration code: {row.get('registrationCode', '').strip()}",
            f"Legacy state: {row.get('state', '').strip()}",
            f"Legacy issues: {row.get('issues', '').strip()}",
            f"Imported issue type: {issue_type}",
            f"Legacy channel: {row.get('channel', '').strip()}",
        ]
        approved_quantity = str(row.get("approvedQuantity") or "").strip()
        approved_value = str(row.get("approvedValue") or "").strip()
        if approved_quantity:
            notes.append(f"Legacy approved quantity: {approved_quantity}")
        if approved_value:
            notes.append(f"Legacy approved value: {approved_value}")
        if attachment_urls:
            notes.append(f"Legacy affected area attachment URLs: {', '.join(attachment_urls[:3])}")
        return "\n".join(note for note in notes if note)

    def _map_state(self, value: str) -> str:
        return CLAIM_STATE_MAP.get(str(value or "").strip(), ClaimState.SUBMITTED)

    def _map_issue_type(self, *, row: dict[str, str]) -> str:
        legacy_issues = self._json_values(row.get("issues", ""))
        if not legacy_issues:
            return IssueType.OTHERS
        return ISSUE_TYPE_MAP.get(str(legacy_issues[0]).strip().casefold(), IssueType.OTHERS)

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

    def _json_values(self, value: str) -> list[Any]:
        if not value or not value.strip():
            return []
        try:
            parsed_value = json.loads(value)
        except json.JSONDecodeError:
            return []
        if not isinstance(parsed_value, list):
            return []
        return parsed_value

    def _count_non_image_attachments(self, attachments: list[dict[str, Any]]) -> int:
        return sum(1 for attachment in attachments if not self._is_image_attachment(attachment))

    def _is_image_attachment(self, attachment: dict[str, Any]) -> bool:
        return str(attachment.get("contentType") or "").strip().casefold().startswith("image/")

    def _parse_decimal(self, value: Any) -> Decimal | None:
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            return None

    def _required(self, row: dict[str, str], field_name: str, *, row_index: int) -> str:
        value = str(row.get(field_name) or "").strip()
        if not value:
            raise ValueError(f"Missing required CSV field {field_name}.")
        return value
