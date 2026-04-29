from __future__ import annotations

import re

from dataclasses import dataclass
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import transaction

from dulux_chatbot.products.choices import Environment, ProductType
from dulux_chatbot.products.models import Product, ProductBasecoat, ProductSurfaceMapping, SurfaceType


try:
    from openpyxl import load_workbook
except ImportError as exc:  # pragma: no cover
    raise ImportError("openpyxl is required to import .xlsx files. Install it and retry.") from exc


_NON_ALNUM_PATTERN = re.compile(r"[^a-z0-9]+")


def _normalize_header(value: str) -> str:
    return _NON_ALNUM_PATTERN.sub("_", value.strip().lower()).strip("_")


def _normalize_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _parse_int(value: object) -> int:
    if value is None:
        return 0
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    text = _normalize_text(value)
    if not text:
        return 0
    try:
        return int(float(text))
    except ValueError:
        return 0


def _parse_bool(value: object, *, default: bool) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    text = _normalize_text(value).lower()
    if text in {"1", "true", "yes", "y", "active"}:
        return True
    if text in {"0", "false", "no", "n", "inactive"}:
        return False
    return default


def _map_product_type(raw_value: object) -> str:
    raw = _normalize_text(raw_value).lower()
    if "base" in raw:
        return ProductType.BASECOAT
    if "top" in raw:
        return ProductType.TOPCOAT
    if "special" in raw:
        return ProductType.SPECIALIST
    # Any unknown type should be treated as topcoat (per requirement).
    return ProductType.TOPCOAT


@dataclass(frozen=True)
class ImportStats:
    created: int = 0
    updated: int = 0
    skipped_missing_url: int = 0
    skipped_missing_name: int = 0
    skipped_empty_rows: int = 0
    continuation_rows: int = 0
    surface_mappings_created: int = 0
    basecoat_links_created: int = 0
    type_conflicts: int = 0


class Command(BaseCommand):
    help = "Import products from an XLSX file (upsert by name, skip rows with missing website URL)."

    NAME_KEYS = {"name", "product_name", "product"}
    TYPE_KEYS = {"product_type", "type", "product_category", "category", "product_type_topcoat_basecoat"}
    ENVIRONMENT_KEYS = {"interior_exterior", "environment"}
    WARRANTY_KEYS = {
        "warranty_years",
        "warranty_year",
        "warranty",
        "warranty_in_years",
        "no_of_warranty_years",
        "no_of_warranty_year",
    }
    DESCRIPTION_KEYS = {"product_description", "description"}
    FEATURES_KEYS = {"features", "feature", "key_features", "product_features"}
    COVERAGE_KEYS = {"coverage_details", "coverage", "coverage_detail", "coverage_details_text"}
    URL_KEYS = {"webpage_url", "website_url", "wesbite_url", "url", "web_url", "webpage", "webpage_link"}
    LINKED_BASECOATS_KEYS = {"linked_basecoats", "basecoats"}
    SURFACE_TYPE_KEYS = {"surface_type", "surface", "surface_types"}
    ACTIVE_KEYS = {"is_active", "active", "status"}

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("xlsx_path", type=str, help="Path to the XLSX file.")
        parser.add_argument("--sheet", type=str, default="", help="Sheet name (defaults to active sheet).")
        parser.add_argument("--dry-run", action="store_true", help="Validate/parse but do not write to DB.")
        parser.add_argument("--batch-size", type=int, default=200, help="Rows per transaction.")

    def handle(self, *args, **options) -> None:
        xlsx_path = Path(str(options["xlsx_path"])).expanduser()
        if not xlsx_path.exists():
            raise CommandError(f"XLSX file does not exist: {xlsx_path}")
        if options["batch_size"] <= 0:
            raise CommandError("--batch-size must be greater than 0.")

        workbook = load_workbook(filename=str(xlsx_path), data_only=True)
        sheet_name = _normalize_text(options.get("sheet", ""))
        if sheet_name:
            if sheet_name not in workbook.sheetnames:
                raise CommandError(f"Sheet not found: {sheet_name}. Available: {', '.join(workbook.sheetnames)}")
            worksheet = workbook[sheet_name]
        else:
            worksheet = workbook.active

        rows_iter = worksheet.iter_rows(values_only=True)
        try:
            header_row = next(rows_iter)
        except StopIteration:
            raise CommandError("XLSX sheet is empty.")

        headers = [_normalize_header(_normalize_text(cell)) for cell in header_row]
        if not any(headers):
            raise CommandError("Header row is empty.")

        header_to_index = {header: index for index, header in enumerate(headers) if header}

        stats = ImportStats()
        self._reset_current_state()
        buffer: list[tuple[int, tuple]] = []

        for row_index, row in enumerate(rows_iter, start=2):
            buffer.append((row_index, row))
            if len(buffer) < int(options["batch_size"]):
                continue
            stats = self._import_batch(
                batch=buffer,
                header_to_index=header_to_index,
                stats=stats,
                dry_run=bool(options["dry_run"]),
            )
            buffer = []

        if buffer:
            stats = self._import_batch(
                batch=buffer,
                header_to_index=header_to_index,
                stats=stats,
                dry_run=bool(options["dry_run"]),
            )

        if not bool(options["dry_run"]):
            stats = self._flush_current_product(stats)

        self.stdout.write(
            self.style.SUCCESS(
                "Import complete. "
                f"created={stats.created} updated={stats.updated} "
                f"skipped_missing_url={stats.skipped_missing_url} skipped_missing_name={stats.skipped_missing_name} "
                f"skipped_empty_rows={stats.skipped_empty_rows} continuation_rows={stats.continuation_rows} "
                f"surface_mappings_created={stats.surface_mappings_created} basecoat_links_created={stats.basecoat_links_created} "
                f"type_conflicts={stats.type_conflicts}"
            )
        )

    def _reset_current_state(self) -> None:
        self._current_product: Product | None = None
        self._current_product_type: str | None = None
        self._current_environments: set[str] = set()
        self._current_features_lines: list[str] = []
        self._current_coverage_lines: list[str] = []
        self._current_linked_basecoat_names: set[str] = set()
        self._current_surface_type_names: set[str] = set()
        self._dry_has_current_main_row = False

    def _apply_environment_cell(self, value: str) -> None:
        if not value:
            return
        env = value.strip().lower()
        # Some sheets use "Interior/Exterior" (or similar) to mean both.
        has_interior = "interior" in env
        has_exterior = "exterior" in env
        if has_interior:
            self._current_environments.add(Environment.INTERIOR)
        if has_exterior:
            self._current_environments.add(Environment.EXTERIOR)

    def _flush_current_product(self, stats: ImportStats) -> ImportStats:
        product = getattr(self, "_current_product", None)
        if product is None:
            return stats

        features_text = "\n".join(line for line in getattr(self, "_current_features_lines", []) if line).strip()
        coverage_text = "\n".join(line for line in getattr(self, "_current_coverage_lines", []) if line).strip()

        if features_text:
            product.features = features_text
        if coverage_text:
            product.coverage_details = coverage_text
        product.save()

        basecoat_links_created = stats.basecoat_links_created
        surface_mappings_created = stats.surface_mappings_created

        if getattr(self, "_current_product_type", None) == ProductType.TOPCOAT and self._current_linked_basecoat_names:
            basecoats = {
                item.name: item
                for item in Product.objects.filter(
                    name__in=self._current_linked_basecoat_names,
                    product_type=ProductType.BASECOAT,
                )
            }
            for basecoat in basecoats.values():
                _mapping, created = ProductBasecoat.objects.get_or_create(topcoat=product, basecoat=basecoat)
                if created:
                    basecoat_links_created += 1

        if self._current_surface_type_names and self._current_environments:
            for surface_name in self._current_surface_type_names:
                for environment in self._current_environments:
                    surface, _created = SurfaceType.objects.get_or_create(
                        name=surface_name,
                        environment=environment,
                    )
                    _mapping, created = ProductSurfaceMapping.objects.get_or_create(
                        product=product, surface_type=surface
                    )
                    if created:
                        surface_mappings_created += 1

        self._reset_current_state()
        return ImportStats(
            **{
                **stats.__dict__,
                "basecoat_links_created": basecoat_links_created,
                "surface_mappings_created": surface_mappings_created,
            }
        )

    def _import_batch(
        self,
        *,
        batch: list[tuple[int, tuple]],
        header_to_index: dict[str, int],
        stats: ImportStats,
        dry_run: bool,
    ) -> ImportStats:
        if dry_run:
            for row_index, row in batch:
                stats = self._parse_and_upsert_row(
                    row_index=row_index,
                    row=row,
                    header_to_index=header_to_index,
                    stats=stats,
                    dry_run=True,
                )
            return stats

        with transaction.atomic():
            for row_index, row in batch:
                stats = self._parse_and_upsert_row(
                    row_index=row_index,
                    row=row,
                    header_to_index=header_to_index,
                    stats=stats,
                    dry_run=False,
                )
        return stats

    def _get_cell(self, *, row: tuple, header_to_index: dict[str, int], keys: set[str]) -> object | None:
        for key in keys:
            column_index = header_to_index.get(key)
            if column_index is None:
                continue
            if column_index < len(row):
                return row[column_index]
        return None

    def _parse_and_upsert_row(
        self,
        *,
        row_index: int,
        row: tuple,
        header_to_index: dict[str, int],
        stats: ImportStats,
        dry_run: bool,
    ) -> ImportStats:
        if not row or all(cell is None or _normalize_text(cell) == "" for cell in row):
            return ImportStats(**{**stats.__dict__, "skipped_empty_rows": stats.skipped_empty_rows + 1})

        name = _normalize_text(self._get_cell(row=row, header_to_index=header_to_index, keys=self.NAME_KEYS))
        webpage_url = _normalize_text(self._get_cell(row=row, header_to_index=header_to_index, keys=self.URL_KEYS))

        description = _normalize_text(
            self._get_cell(row=row, header_to_index=header_to_index, keys=self.DESCRIPTION_KEYS)
        )
        features_cell = _normalize_text(
            self._get_cell(row=row, header_to_index=header_to_index, keys=self.FEATURES_KEYS)
        )
        coverage_cell = _normalize_text(
            self._get_cell(row=row, header_to_index=header_to_index, keys=self.COVERAGE_KEYS)
        )
        linked_basecoats_cell = _normalize_text(
            self._get_cell(row=row, header_to_index=header_to_index, keys=self.LINKED_BASECOATS_KEYS)
        )
        surface_types_cell = _normalize_text(
            self._get_cell(row=row, header_to_index=header_to_index, keys=self.SURFACE_TYPE_KEYS)
        )
        environment_cell = _normalize_text(
            self._get_cell(row=row, header_to_index=header_to_index, keys=self.ENVIRONMENT_KEYS)
        )

        # Continuation row: product info sheet uses multiple rows for a single product.
        if not name and not webpage_url:
            has_continuation_payload = any(
                (description, features_cell, coverage_cell, linked_basecoats_cell, surface_types_cell, environment_cell)
            )
            if not has_continuation_payload:
                return stats

            if dry_run:
                if getattr(self, "_dry_has_current_main_row", False):
                    return ImportStats(**{**stats.__dict__, "continuation_rows": stats.continuation_rows + 1})
                return ImportStats(**{**stats.__dict__, "skipped_missing_name": stats.skipped_missing_name + 1})

            if self._current_product is None:
                return ImportStats(**{**stats.__dict__, "skipped_missing_name": stats.skipped_missing_name + 1})

            if description:
                self._current_features_lines.append(description)
            if features_cell:
                self._current_features_lines.append(features_cell)
            if coverage_cell:
                self._current_coverage_lines.append(coverage_cell)
            if linked_basecoats_cell:
                self._current_linked_basecoat_names.update(
                    {item.strip() for item in linked_basecoats_cell.splitlines() if item and item.strip()}
                )
            if surface_types_cell:
                self._current_surface_type_names.update(
                    {item.strip() for item in surface_types_cell.splitlines() if item and item.strip()}
                )
            if environment_cell:
                self._apply_environment_cell(environment_cell)

            return ImportStats(**{**stats.__dict__, "continuation_rows": stats.continuation_rows + 1})

        # Main row requires a name and URL (per requirement).
        if not name:
            return ImportStats(**{**stats.__dict__, "skipped_missing_name": stats.skipped_missing_name + 1})
        if not webpage_url:
            return ImportStats(**{**stats.__dict__, "skipped_missing_url": stats.skipped_missing_url + 1})

        desired_product_type = _map_product_type(
            self._get_cell(row=row, header_to_index=header_to_index, keys=self.TYPE_KEYS)
        )
        warranty_years = _parse_int(self._get_cell(row=row, header_to_index=header_to_index, keys=self.WARRANTY_KEYS))
        is_active = _parse_bool(
            self._get_cell(row=row, header_to_index=header_to_index, keys=self.ACTIVE_KEYS),
            default=True,
        )

        if dry_run:
            self._dry_has_current_main_row = True
            return stats

        stats = self._flush_current_product(stats)

        product = Product.objects.filter(name=name, product_type=desired_product_type).order_by("id").first()
        if product is None:
            product = Product.objects.filter(name=name).order_by("id").first()

        created = False
        type_conflict = False
        if product is None:
            product = Product(name=name, product_type=desired_product_type)
            created = True
        else:
            if product.product_type != desired_product_type:
                conflict_exists = (
                    Product.objects.filter(name=name, product_type=desired_product_type).exclude(pk=product.pk).exists()
                )
                if conflict_exists:
                    type_conflict = True
                else:
                    product.product_type = desired_product_type

        product.warranty_years = max(0, warranty_years)
        product.webpage_url = webpage_url
        product.is_active = is_active
        product.save()

        # Set up buffers for multi-row import.
        self._current_product = product
        self._current_product_type = desired_product_type
        self._current_features_lines = []
        self._current_coverage_lines = []
        self._current_linked_basecoat_names = set()
        self._current_surface_type_names = set()
        self._current_environments = set()

        if description:
            self._current_features_lines.append(description)
        if features_cell:
            self._current_features_lines.append(features_cell)
        if coverage_cell:
            self._current_coverage_lines.append(coverage_cell)
        if linked_basecoats_cell:
            self._current_linked_basecoat_names.update(
                {item.strip() for item in linked_basecoats_cell.splitlines() if item and item.strip()}
            )
        if surface_types_cell:
            self._current_surface_type_names.update(
                {item.strip() for item in surface_types_cell.splitlines() if item and item.strip()}
            )
        if environment_cell:
            self._apply_environment_cell(environment_cell)

        if created:
            return ImportStats(
                **{
                    **stats.__dict__,
                    "created": stats.created + 1,
                    "type_conflicts": stats.type_conflicts + (1 if type_conflict else 0),
                }
            )

        return ImportStats(
            **{
                **stats.__dict__,
                "updated": stats.updated + 1,
                "type_conflicts": stats.type_conflicts + (1 if type_conflict else 0),
            }
        )
