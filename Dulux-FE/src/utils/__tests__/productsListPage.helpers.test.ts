import { describe, expect, it } from 'vitest';

import { PRODUCTS_LIST_FILTER_ALL } from '#/constants';
import { PRODUCT_TYPES } from '#/types/products';
import { isProductTypeFilter } from '#/utils';

describe('isProductTypeFilter', () => {
  it('accepts all supported product type filters including specialist', () => {
    expect(isProductTypeFilter(PRODUCTS_LIST_FILTER_ALL)).toBe(true);
    expect(isProductTypeFilter(PRODUCT_TYPES.TOPCOAT)).toBe(true);
    expect(isProductTypeFilter(PRODUCT_TYPES.BASECOAT)).toBe(true);
    expect(isProductTypeFilter(PRODUCT_TYPES.SPECIALIST)).toBe(true);
  });

  it('rejects unsupported product type filters', () => {
    expect(isProductTypeFilter('unknown')).toBe(false);
    expect(isProductTypeFilter(null)).toBe(false);
  });
});
