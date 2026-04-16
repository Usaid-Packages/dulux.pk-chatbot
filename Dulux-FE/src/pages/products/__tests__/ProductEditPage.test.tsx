import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useAttachProductImageMutation,
  useGetProductByIdQuery,
  useGetProductsQuery,
  useGetSurfaceTypesQuery,
  useRemoveProductImageMutation,
  useUpdateProductMutation,
  useUploadProductImageMutation,
} from '#/data-layer/products';
import { ProductEditPage } from '../ProductEditPage';

const mockNavigate = vi.fn();

let routeId = '9';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ search: '?tab=products' }),
    useParams: () => ({ id: routeId }),
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
    <button type='button' onClick={() => onSubmit({ values: { name: 'Updated Product' } })}>
      Submit Product Edit
    </button>
  ),
}));

vi.mock('#/data-layer/products', () => ({
  useGetProductByIdQuery: vi.fn(),
  useGetSurfaceTypesQuery: vi.fn(),
  useGetProductsQuery: vi.fn(),
  useUpdateProductMutation: vi.fn(),
  useUploadProductImageMutation: vi.fn(),
  useAttachProductImageMutation: vi.fn(),
  useRemoveProductImageMutation: vi.fn(),
}));

vi.mock('#/hooks/products', () => ({
  mapProductFormValuesToPayload: vi.fn(values => values),
  mapProductToFormValues: vi.fn(() => ({ name: 'Existing' })),
}));

const mockedUseGetProductByIdQuery = vi.mocked(useGetProductByIdQuery);
const mockedUseGetSurfaceTypesQuery = vi.mocked(useGetSurfaceTypesQuery);
const mockedUseGetProductsQuery = vi.mocked(useGetProductsQuery);
const mockedUseUpdateProductMutation = vi.mocked(useUpdateProductMutation);
const mockedUseUploadProductImageMutation = vi.mocked(useUploadProductImageMutation);
const mockedUseAttachProductImageMutation = vi.mocked(useAttachProductImageMutation);
const mockedUseRemoveProductImageMutation = vi.mocked(useRemoveProductImageMutation);

describe('ProductEditPage', () => {
  beforeEach(() => {
    routeId = '9';
    mockNavigate.mockReset();

    mockedUseGetProductByIdQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 9,
        images: [],
      },
    } as unknown as ReturnType<typeof useGetProductByIdQuery>);

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

    mockedUseUpdateProductMutation.mockReturnValue({
      isPending: false,
      mutate: (_payload, callbacks) => callbacks?.onSuccess?.(),
    } as unknown as ReturnType<typeof useUpdateProductMutation>);

    mockedUseUploadProductImageMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useUploadProductImageMutation>);

    mockedUseAttachProductImageMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    } as unknown as ReturnType<typeof useAttachProductImageMutation>);

    mockedUseRemoveProductImageMutation.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useRemoveProductImageMutation>);
  });

  it('submits and navigates back to products list', () => {
    render(<ProductEditPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit Product Edit' }));

    expect(mockNavigate).toHaveBeenCalledWith('/products?tab=products');
  });

  it('renders invalid id state', () => {
    routeId = '';

    render(<ProductEditPage />);

    expect(screen.getByText('Invalid product id')).toBeInTheDocument();
  });
});
