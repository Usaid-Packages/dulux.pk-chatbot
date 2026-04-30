import type {
  Product,
  ProductFormValues,
  ProductMutationPayload,
  SurfaceTypeFormValues,
  SurfaceTypeMutationPayload,
} from '#/types/products';
import { PRODUCT_TYPES } from '#/types/products';

export const mapProductFormValuesToPayload = (values: ProductFormValues): ProductMutationPayload => ({
  name: values.name.trim(),
  product_type: values.productType,
  warranty_years: values.warrantyYears,
  features: values.features.trim(),
  coverage_details: values.coverageDetails.trim(),
  webpage_url: values.webpageUrl.trim(),
  is_active: values.isActive,
  surface_types: values.surfaceTypeIds,
  basecoats:
    values.productType === PRODUCT_TYPES.TOPCOAT
      ? values.basecoatIds
      : values.productType === PRODUCT_TYPES.BASECOAT || values.productType === PRODUCT_TYPES.SPECIALIST
        ? [0]
        : [],
});

export const mapProductToFormValues = (product: Product): ProductFormValues => ({
  name: product.name,
  productType: product.productType,
  warrantyYears: product.warrantyYears,
  coverageDetails: product.coverageDetails,
  webpageUrl: product.webpageUrl,
  features: product.features,
  isActive: product.isActive,
  surfaceTypeIds: product.surfaceTypes.map(surfaceType => surfaceType.id),
  basecoatIds: product.basecoats.map(basecoat => basecoat.id),
});

export const mapSurfaceTypeFormToPayload = (values: SurfaceTypeFormValues): SurfaceTypeMutationPayload => ({
  name: values.name.trim(),
  environment: values.environment,
});
