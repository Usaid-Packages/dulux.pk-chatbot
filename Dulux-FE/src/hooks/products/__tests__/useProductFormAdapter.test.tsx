import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProductFormSchemaValues } from '#/schemas/products';
import { PRODUCT_TYPES } from '#/types/products';
import type { ProductImage } from '#/types/products';
import { useProductFormAdapter } from '../useProductFormAdapter';

const VALID_FORM_VALUES: ProductFormSchemaValues = {
  name: 'Dulux Shield',
  productType: PRODUCT_TYPES.TOPCOAT,
  warrantyYears: 2,
  coverageDetails: 'Coverage details',
  webpageUrl: 'https://example.com/product',
  features: 'Key features',
  isActive: true,
  surfaceTypeIds: [1],
  basecoatIds: [],
};

const EXISTING_IMAGE: ProductImage = {
  id: 1,
  image: {
    id: 101,
    image: 'https://example.com/image.jpg',
    thumbnail: 'https://example.com/thumb.jpg',
    url: 'https://example.com/image.jpg',
  },
  created: '2026-04-29T00:00:00Z',
};

describe('useProductFormAdapter image requirement', () => {
  it('blocks submit when no existing image and no selected image file', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useProductFormAdapter({
        initialImages: [],
        initialValues: undefined,
        surfaceTypes: [],
        basecoatOptions: [],
        onSubmit,
      })
    );

    act(() => {
      result.current.handleFormSubmit(VALID_FORM_VALUES);
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.imageValidationError).toBe('Product image is required.');
  });

  it('allows submit when an existing product image is present', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useProductFormAdapter({
        initialImages: [EXISTING_IMAGE],
        initialValues: undefined,
        surfaceTypes: [],
        basecoatOptions: [],
        onSubmit,
      })
    );

    act(() => {
      result.current.handleFormSubmit(VALID_FORM_VALUES);
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
