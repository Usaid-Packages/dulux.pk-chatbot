import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PRODUCT_TYPES } from '#/types/products';
import { useProductEditPageController } from '../useProductEditPageController';

const useLocationMock = vi.fn();
const useNavigateMock = vi.fn();
const useParamsMock = vi.fn();
const useGetProductByIdQueryMock = vi.fn();
const useGetSurfaceTypesQueryMock = vi.fn();
const useGetProductsQueryMock = vi.fn();
const useUpdateProductMutationMock = vi.fn();
const useUploadProductImageMutationMock = vi.fn();
const useAttachProductImageMutationMock = vi.fn();
const useRemoveProductImageMutationMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useLocation: () => useLocationMock(),
  useNavigate: () => useNavigateMock(),
  useParams: () => useParamsMock(),
}));

vi.mock('#/data-layer/products', () => ({
  useAttachProductImageMutation: () => useAttachProductImageMutationMock(),
  useGetProductByIdQuery: (...args: unknown[]) => useGetProductByIdQueryMock(...args),
  useGetProductsQuery: (...args: unknown[]) => useGetProductsQueryMock(...args),
  useGetSurfaceTypesQuery: () => useGetSurfaceTypesQueryMock(),
  useRemoveProductImageMutation: () => useRemoveProductImageMutationMock(),
  useUpdateProductMutation: () => useUpdateProductMutationMock(),
  useUploadProductImageMutation: () => useUploadProductImageMutationMock(),
}));

describe('useProductEditPageController', () => {
  it('requests only active basecoat options for edit product mappings', () => {
    useLocationMock.mockReturnValue({ search: '' });
    useNavigateMock.mockReturnValue(vi.fn());
    useParamsMock.mockReturnValue({ id: '42' });
    useGetProductByIdQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      error: null,
      data: {
        id: 42,
        name: 'Topcoat A',
        productType: PRODUCT_TYPES.TOPCOAT,
        warrantyYears: 5,
        coverageDetails: '',
        webpageUrl: '',
        features: '',
        isActive: true,
        surfaceTypes: [],
        basecoats: [],
        images: [],
        created: '',
        modified: '',
      },
    });
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
    useUpdateProductMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() });
    useUploadProductImageMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() });
    useAttachProductImageMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() });
    useRemoveProductImageMutationMock.mockReturnValue({ isPending: false, mutate: vi.fn() });

    renderHook(() => useProductEditPageController());

    expect(useGetProductsQueryMock).toHaveBeenCalledWith({
      product_type: PRODUCT_TYPES.BASECOAT,
      is_active: true,
      ordering: 'name',
      page_size: 100,
    });
  });
});
