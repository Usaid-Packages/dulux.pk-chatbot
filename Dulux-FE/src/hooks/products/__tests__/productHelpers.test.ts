import { describe, expect, it } from 'vitest';

import { PRODUCT_TYPES } from '#/types/products';
import type { ProductFormValues } from '#/types/products';
import { mapProductFormValuesToPayload } from '../productHelpers';

const BASE_FORM_VALUES: ProductFormValues = {
  name: ' Product A ',
  productType: PRODUCT_TYPES.TOPCOAT,
  warrantyYears: 5,
  coverageDetails: ' Coverage ',
  webpageUrl: ' https://example.com/p ',
  features: ' Features ',
  isActive: true,
  surfaceTypeIds: [1, 2],
  basecoatIds: [10, 11],
};

describe('mapProductFormValuesToPayload', () => {
  it('maps topcoat basecoats from selected basecoat ids', () => {
    const payload = mapProductFormValuesToPayload({
      ...BASE_FORM_VALUES,
      productType: PRODUCT_TYPES.TOPCOAT,
      basecoatIds: [10, 11],
    });

    expect(payload.basecoats).toEqual([10, 11]);
  });

  it('sends empty basecoats for basecoat products', () => {
    const payload = mapProductFormValuesToPayload({
      ...BASE_FORM_VALUES,
      productType: PRODUCT_TYPES.BASECOAT,
      basecoatIds: [],
    });

    expect(payload.basecoats).toEqual([]);
  });

  it('sends empty basecoats for specialist products', () => {
    const payload = mapProductFormValuesToPayload({
      ...BASE_FORM_VALUES,
      productType: PRODUCT_TYPES.SPECIALIST,
      basecoatIds: [10],
    });

    expect(payload.basecoats).toEqual([]);
  });

  it('filters out invalid topcoat basecoat ids like 0', () => {
    const payload = mapProductFormValuesToPayload({
      ...BASE_FORM_VALUES,
      productType: PRODUCT_TYPES.TOPCOAT,
      basecoatIds: [10, 0, 11],
    });

    expect(payload.basecoats).toEqual([10, 11]);
  });
});
