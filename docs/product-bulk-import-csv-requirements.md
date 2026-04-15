# Product Bulk Import CSV Requirements

This document defines the CSV columns needed to bulk import products into the current backend schema.

## Target Tables

Product CSV import should populate:

- `products.Product`
- `products.ProductBasecoat`
- `products.SurfaceType`
- `products.ProductSurfaceMapping`
- optionally `products.ProductImage` if image files/URLs are supported by the importer

## Required Product Fields

These fields map directly to `Product`.

| CSV Column | Required | Type | Example | Notes |
|---|---:|---|---|---|
| `name` | Yes | string, max 255 | `Dulux Weathershield` | Product name. Must be unique with `product_type`. |
| `product_type` | Yes | enum | `TOPCOAT` | Allowed values: `TOPCOAT`, `BASECOAT`. |
| `warranty_years` | Yes | integer >= 0 | `5` | Products with `0` warranty years are not shown in warranty registration options. |
| `features` | Yes | text | `Weather resistant exterior finish.` | Used in Find a Product WhatsApp response. |
| `coverage_details` | Yes | text | `10-12 sqm/liter/coat` | Used in Find a Product WhatsApp response. |
| `webpage_url` | Yes | URL | `https://www.dulux.com.pk/...` | Must be a valid URL. |
| `is_active` | No | boolean | `true` | Defaults to `true` if blank. Accepted values should be `true/false`, `yes/no`, `1/0`. |

## Relationship Fields

These fields are not on the `Product` table directly, but are needed for product options and mappings.

| CSV Column | Required | Type | Example | Notes |
|---|---:|---|---|---|
| `linked_basecoats` | No | pipe-separated product names | `Dulux Primer A\|Dulux Primer B` | Only used when current row is a `TOPCOAT`. Basecoat products must exist or be created by importer. |
| `surface_types` | No | pipe-separated values | `INTERIOR:Wall\|EXTERIOR:Exterior Wall` | Creates/fetches `SurfaceType` and links product to surfaces for Find a Product flow. |
| `image_url` | No | URL | `https://cdn.example.com/product.jpg` | Optional product image. Importer must download/store it before creating `ProductImage`. |
| `image_file` | No | file path/name | `products/weathershield.jpg` | Alternative to `image_url` if importing local files. |

## Recommended CSV Header

```csv
name,product_type,warranty_years,features,coverage_details,webpage_url,is_active,linked_basecoats,surface_types,image_url,image_file
```

## Example CSV

```csv
name,product_type,warranty_years,features,coverage_details,webpage_url,is_active,linked_basecoats,surface_types,image_url,image_file
Dulux Weathershield,TOPCOAT,5,"Weather resistant exterior finish.","10-12 sqm/liter/coat",https://www.dulux.com.pk/weathershield,true,"Dulux Exterior Primer","EXTERIOR:Exterior Wall|EXTERIOR:Concrete",,
Dulux Exterior Primer,BASECOAT,5,"Primer for exterior topcoat systems.","8-10 sqm/liter/coat",https://www.dulux.com.pk/exterior-primer,true,,"EXTERIOR:Exterior Wall",,
Dulux EasyCare,TOPCOAT,3,"Washable interior paint.","12-14 sqm/liter/coat",https://www.dulux.com.pk/easycare,true,,"INTERIOR:Wall|INTERIOR:Ceiling",https://cdn.example.com/easycare.jpg,
```

## Field Rules

- `name + product_type` must be unique.
- `product_type` must be exactly `TOPCOAT` or `BASECOAT`.
- `warranty_years` must be a whole number and cannot be negative.
- `webpage_url` must be a valid URL.
- `linked_basecoats` should only reference basecoat product names.
- `surface_types` format should be `ENVIRONMENT:Surface Name`.
- `ENVIRONMENT` must be `INTERIOR` or `EXTERIOR`.
- Multiple values should be separated by pipe character `|`.
- If both `image_url` and `image_file` are provided, importer should prefer `image_file` or fail with a clear validation message.

## Import Behavior

Recommended importer behavior:

- If product with same `name` and `product_type` exists, update it instead of creating duplicate.
- If linked basecoat does not exist, create it only if enough basecoat details are available in another CSV row.
- If surface type does not exist, create it using `name` and `environment`.
- Re-create product surface mappings idempotently.
- Re-create topcoat-basecoat mappings idempotently.
- Skip blank relationship columns.
- Return a summary with created, updated, skipped, and failed row counts.

## Warranty And WhatsApp Impact

- Warranty registration options only show active products with `warranty_years > 0`.
- Warranty claim creation also rejects claim products with `warranty_years = 0`.
- Find a Product flow only shows products linked to selected surface types and `is_active = true`.

## Minimal Required CSV

If only products are being imported without relationships/images, use:

```csv
name,product_type,warranty_years,features,coverage_details,webpage_url,is_active
```

Example:

```csv
name,product_type,warranty_years,features,coverage_details,webpage_url,is_active
Dulux Weathershield,TOPCOAT,5,"Weather resistant exterior finish.","10-12 sqm/liter/coat",https://www.dulux.com.pk/weathershield,true
```
