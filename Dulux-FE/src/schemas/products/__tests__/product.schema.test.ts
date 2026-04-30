import { describe, expect, it } from 'vitest';

import { productFormSchema } from '#/schemas/products';
import { PRODUCT_TYPES } from '#/types/products';

const VALID_BASE_VALUES = {
  name: 'Dulux Shield',
  coverageDetails: 'Coverage details',
  webpageUrl: 'https://example.com/product',
  features: 'Key features',
  isActive: true,
  surfaceTypeIds: [1],
  basecoatIds: [],
};

describe('productFormSchema warranty validation', () => {
  it('requires warranty years for specialist products', () => {
    const result = productFormSchema.safeParse({
      ...VALID_BASE_VALUES,
      productType: PRODUCT_TYPES.SPECIALIST,
      warrantyYears: undefined,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.error.issues[0]?.message).toBe('Warranty years are required.');
  });

  it('rejects negative warranty years for basecoat products', () => {
    const result = productFormSchema.safeParse({
      ...VALID_BASE_VALUES,
      productType: PRODUCT_TYPES.BASECOAT,
      warrantyYears: -1,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.error.issues[0]?.message).toBe('Warranty years must be 0 or greater.');
  });
});
