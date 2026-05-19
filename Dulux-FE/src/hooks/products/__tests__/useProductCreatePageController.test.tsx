import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PRODUCT_TYPES } from '#/types/products';
import { useProductCreatePageController } from '../useProductCreatePageController';

const useLocationMock = vi.fn();
const useNavigateMock = vi.fn();
const useGetSurfaceTypesQueryMock = vi.fn();
const useGetProductsQueryMock = vi.fn();
const useCreateProductMutationMock = vi.fn();
const useUploadProductImageMutationMock = vi.fn();
const useAttachProductImageMutationMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useLocation: () => useLocationMock(),
  useNavigate: () => useNavigateMock(),
}));

vi.mock('#/data-layer/products', () => ({
  useAttachProductImageMutation: () => useAttachProductImageMutationMock(),
  useCreateProductMutation: () => useCreateProductMutationMock(),
  useGetProductsQuery: (...args: unknown[]) => useGetProductsQueryMock(...args),
  useGetSurfaceTypesQuery: () => useGetSurfaceTypesQueryMock(),
  useUploadProductImageMutation: () => useUploadProductImageMutationMock(),
}));

describe('useProductCreatePageController', () => {
  it('requests only active basecoat options for product form mappings', () => {
    useLocationMock.mockReturnValue({ search: '' });
    useNavigateMock.mockReturnValue(vi.fn());
    useGetSurfaceTypesQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      error: null,
      data: { results: [] },
    });
    useGetProductsQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      error: null,
      data: { results: [] },
    });
    useCreateProductMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() });
    useUploadProductImageMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() });
    useAttachProductImageMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() });

    renderHook(() => useProductCreatePageController());

    expect(useGetProductsQueryMock).toHaveBeenCalledWith({
      product_type: PRODUCT_TYPES.BASECOAT,
      is_active: true,
      ordering: 'name',
      page_size: 100,
    });
  });
});
