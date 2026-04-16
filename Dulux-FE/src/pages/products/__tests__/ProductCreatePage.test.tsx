import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useAttachProductImageMutation,
  useCreateProductMutation,
  useGetProductsQuery,
  useGetSurfaceTypesQuery,
  useUploadProductImageMutation,
} from '#/data-layer/products';
import { ProductCreatePage } from '../ProductCreatePage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ search: '?tab=products' }),
  };
});

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('#/components/products', () => ({
  ProductForm: ({ onSubmit }: { onSubmit: (payload: { values: { name: string }; imageFile?: File }) => void }) => (
    <button type='button' onClick={() => onSubmit({ values: { name: 'New Product' } })}>
      Submit Product Create
    </button>
  ),
}));

vi.mock('#/data-layer/products', () => ({
  useGetSurfaceTypesQuery: vi.fn(),
  useGetProductsQuery: vi.fn(),
  useCreateProductMutation: vi.fn(),
  useUploadProductImageMutation: vi.fn(),
  useAttachProductImageMutation: vi.fn(),
}));

vi.mock('#/hooks/products', () => ({
  mapProductFormValuesToPayload: vi.fn(values => values),
}));

const mockedUseGetSurfaceTypesQuery = vi.mocked(useGetSurfaceTypesQuery);
const mockedUseGetProductsQuery = vi.mocked(useGetProductsQuery);
const mockedUseCreateProductMutation = vi.mocked(useCreateProductMutation);
const mockedUseUploadProductImageMutation = vi.mocked(useUploadProductImageMutation);
const mockedUseAttachProductImageMutation = vi.mocked(useAttachProductImageMutation);

describe('ProductCreatePage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();

    mockedUseGetSurfaceTypesQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        results: [],
      },
    } as unknown as ReturnType<typeof useGetSurfaceTypesQuery>);

    mockedUseGetProductsQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        results: [],
      },
    } as unknown as ReturnType<typeof useGetProductsQuery>);

    mockedUseCreateProductMutation.mockReturnValue({
      isPending: false,
      mutate: (_payload, callbacks) => callbacks?.onSuccess?.({ id: 7 }),
    } as unknown as ReturnType<typeof useCreateProductMutation>);

    mockedUseUploadProductImageMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useUploadProductImageMutation>);

    mockedUseAttachProductImageMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useAttachProductImageMutation>);
  });

  it('submits and navigates back to products list', () => {
    render(<ProductCreatePage />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit Product Create' }));

    expect(mockNavigate).toHaveBeenCalledWith('/products?tab=products');
  });

  it('renders dependencies error state', () => {
    mockedUseGetSurfaceTypesQuery.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error('Surface deps fail'),
      data: null,
    } as unknown as ReturnType<typeof useGetSurfaceTypesQuery>);

    render(<ProductCreatePage />);

    expect(screen.getByText('Unable to load product dependencies')).toBeInTheDocument();
    expect(screen.getByText('Surface deps fail')).toBeInTheDocument();
  });
});
