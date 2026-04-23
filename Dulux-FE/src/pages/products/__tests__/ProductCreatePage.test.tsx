import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useAttachProductImageMutation,
  useCreateProductMutation,
  useGetProductsQuery,
  useGetSurfaceTypesQuery,
  useUploadProductImageMutation,
} from '#/data-layer/products';
import { mapProductFormValuesToPayload } from '#/hooks/products';
import { ProductCreatePage } from '../ProductCreatePage';

const mockNavigate = vi.fn();
const mockCreateProduct = vi.fn();

const mockLocation = {
  search: '?tab=products',
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

vi.mock('#/hooks/products', () => ({
  mapProductFormValuesToPayload: vi.fn(),
}));

vi.mock('#/components/products', () => ({
  ProductForm: ({
    onCancel,
    onSubmit,
  }: {
    title: string;
    description: string;
    submitLabel: string;
    defaultBasecoatWarrantyYears: number;
    isSubmitting: boolean;
    useSplitLongFieldLayout: boolean;
    surfaceTypes: unknown[];
    basecoatOptions: unknown[];
    onCancel: () => void;
    onSubmit: (values: unknown) => void;
  }) => (
    <div>
      <button type='button' onClick={onCancel}>
        Cancel Product Create
      </button>
      <button
        type='button'
        onClick={() =>
          onSubmit({
            values: {
              name: 'Dulux Shield',
              productType: 'TOPCOAT',
            },
            imageFile: null,
          })
        }
      >
        Submit Product Create
      </button>
    </div>
  ),
}));

vi.mock('#/data-layer/products', () => ({
  useGetSurfaceTypesQuery: vi.fn(),
  useGetProductsQuery: vi.fn(),
  useCreateProductMutation: vi.fn(),
  useUploadProductImageMutation: vi.fn(),
  useAttachProductImageMutation: vi.fn(),
}));

const mockedUseGetSurfaceTypesQuery = vi.mocked(useGetSurfaceTypesQuery);
const mockedUseGetProductsQuery = vi.mocked(useGetProductsQuery);
const mockedUseCreateProductMutation = vi.mocked(useCreateProductMutation);
const mockedUseUploadProductImageMutation = vi.mocked(useUploadProductImageMutation);
const mockedUseAttachProductImageMutation = vi.mocked(useAttachProductImageMutation);
const mockedMapProductFormValuesToPayload = vi.mocked(mapProductFormValuesToPayload);

describe('ProductCreatePage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockCreateProduct.mockReset();

    mockedMapProductFormValuesToPayload.mockReturnValue({
      name: 'Mapped Product',
    });

    mockedUseGetSurfaceTypesQuery.mockReturnValue({
      data: {
        results: [{ id: 1, name: 'Wood' }],
      },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useGetSurfaceTypesQuery>);

    mockedUseGetProductsQuery.mockReturnValue({
      data: {
        results: [{ id: 99, name: 'Basecoat X' }],
      },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useGetProductsQuery>);

    mockedUseCreateProductMutation.mockReturnValue({
      mutate: mockCreateProduct,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateProductMutation>);

    mockedUseUploadProductImageMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUploadProductImageMutation>);

    mockedUseAttachProductImageMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useAttachProductImageMutation>);
  });

  it('renders dependency error state when reference queries fail', () => {
    mockedUseGetSurfaceTypesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Surface types failed'),
    } as unknown as ReturnType<typeof useGetSurfaceTypesQuery>);

    render(<ProductCreatePage />);

    expect(screen.getByText('Unable to load product dependencies')).toBeInTheDocument();
    expect(screen.getByText('Surface types failed')).toBeInTheDocument();
  });

  it('navigates to products list on cancel', () => {
    render(<ProductCreatePage />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel Product Create' }));

    expect(mockNavigate).toHaveBeenCalledWith('/products?tab=products');
  });

  it('submits create mutation and navigates on success', () => {
    mockCreateProduct.mockImplementation((_: unknown, options?: { onSuccess?: (value: { id: number }) => void }) => {
      options?.onSuccess?.({ id: 321 });
    });

    render(<ProductCreatePage />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit Product Create' }));

    expect(mockCreateProduct).toHaveBeenCalledWith(
      { name: 'Mapped Product' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
    expect(mockNavigate).toHaveBeenCalledWith('/products?tab=products');
  });
});
