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

describe('useProductFormAdapter warranty defaults', () => {
  it('defaults cleared warranty to 0 when switching to specialist', () => {
    const { result } = renderHook(() =>
      useProductFormAdapter({
        initialImages: [],
        initialValues: {
          ...VALID_FORM_VALUES,
          warrantyYears: undefined,
          productType: PRODUCT_TYPES.TOPCOAT,
        },
        surfaceTypes: [],
        basecoatOptions: [],
        onSubmit: vi.fn(),
      })
    );

    act(() => {
      const warrantyField = result.current.register('warrantyYears');
      warrantyField.onChange({ target: { name: 'warrantyYears', value: '' } });
    });

    act(() => {
      const productTypeField = result.current.register('productType');
      productTypeField.onChange({ target: { name: 'productType', value: PRODUCT_TYPES.SPECIALIST } });
    });

    expect(result.current.control._formValues.warrantyYears).toBe(0);
  });

  it('defaults cleared warranty to 0 when switching to basecoat', () => {
    const { result } = renderHook(() =>
      useProductFormAdapter({
        initialImages: [],
        initialValues: {
          ...VALID_FORM_VALUES,
          warrantyYears: undefined,
          productType: PRODUCT_TYPES.TOPCOAT,
        },
        surfaceTypes: [],
        basecoatOptions: [],
        onSubmit: vi.fn(),
      })
    );

    act(() => {
      const warrantyField = result.current.register('warrantyYears');
      warrantyField.onChange({ target: { name: 'warrantyYears', value: '' } });
    });

    act(() => {
      const productTypeField = result.current.register('productType');
      productTypeField.onChange({ target: { name: 'productType', value: PRODUCT_TYPES.BASECOAT } });
    });

    expect(result.current.control._formValues.warrantyYears).toBe(0);
  });
});
