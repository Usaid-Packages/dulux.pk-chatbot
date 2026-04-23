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
import { mapProductFormValuesToPayload, mapProductToFormValues } from '#/hooks/products';
import { ProductEditPage } from '../ProductEditPage';

const mockNavigate = vi.fn();
const mockUpdateProduct = vi.fn();
const mockRemoveProductImage = vi.fn();

const mockLocation = {
  search: '?tab=products',
};

const mockParams = {
  id: '42',
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    useParams: () => mockParams,
  };
});

vi.mock('#/hooks/products', () => ({
  mapProductFormValuesToPayload: vi.fn(),
  mapProductToFormValues: vi.fn(),
}));

vi.mock('#/components/products', () => ({
  ProductForm: ({
    onCancel,
    onRemoveImage,
    onSubmit,
  }: {
    title: string;
    description: string;
    submitLabel: string;
    isSubmitting: boolean;
    initialValues: unknown;
    initialImages: unknown[];
    surfaceTypes: unknown[];
    basecoatOptions: unknown[];
    isImageActionPending: boolean;
    onCancel: () => void;
    onRemoveImage: (imageId: string) => void;
    onSubmit: (values: unknown) => void;
  }) => (
    <div>
      <button type='button' onClick={onCancel}>
        Cancel Product Edit
      </button>
      <button type='button' onClick={() => onRemoveImage('img-1')}>
        Remove Product Image
      </button>
      <button
        type='button'
        onClick={() =>
          onSubmit({
            values: {
              name: 'Updated Product',
            },
            imageFile: null,
          })
        }
      >
        Submit Product Edit
      </button>
    </div>
  ),
}));

vi.mock('#/data-layer/products', () => ({
  useGetProductByIdQuery: vi.fn(),
  useGetProductsQuery: vi.fn(),
  useGetSurfaceTypesQuery: vi.fn(),
  useUpdateProductMutation: vi.fn(),
  useUploadProductImageMutation: vi.fn(),
  useAttachProductImageMutation: vi.fn(),
  useRemoveProductImageMutation: vi.fn(),
}));

const mockedUseGetProductByIdQuery = vi.mocked(useGetProductByIdQuery);
const mockedUseGetProductsQuery = vi.mocked(useGetProductsQuery);
const mockedUseGetSurfaceTypesQuery = vi.mocked(useGetSurfaceTypesQuery);
const mockedUseUpdateProductMutation = vi.mocked(useUpdateProductMutation);
const mockedUseUploadProductImageMutation = vi.mocked(useUploadProductImageMutation);
const mockedUseAttachProductImageMutation = vi.mocked(useAttachProductImageMutation);
const mockedUseRemoveProductImageMutation = vi.mocked(useRemoveProductImageMutation);
const mockedMapProductFormValuesToPayload = vi.mocked(mapProductFormValuesToPayload);
const mockedMapProductToFormValues = vi.mocked(mapProductToFormValues);

describe('ProductEditPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUpdateProduct.mockReset();
    mockRemoveProductImage.mockReset();
    mockParams.id = '42';

    mockedMapProductFormValuesToPayload.mockReturnValue({
      name: 'Mapped Product Update',
    });
    mockedMapProductToFormValues.mockReturnValue({
      name: 'Existing Product',
    } as unknown as ReturnType<typeof mapProductToFormValues>);

    mockedUseGetProductByIdQuery.mockReturnValue({
      data: {
        id: 42,
        images: [{ id: 'img-1' }],
      },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useGetProductByIdQuery>);

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
        results: [{ id: 2, name: 'Basecoat A' }],
      },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useGetProductsQuery>);

    mockedUseUpdateProductMutation.mockReturnValue({
      mutate: mockUpdateProduct,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateProductMutation>);

    mockedUseUploadProductImageMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUploadProductImageMutation>);

    mockedUseAttachProductImageMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useAttachProductImageMutation>);

    mockedUseRemoveProductImageMutation.mockReturnValue({
      mutate: mockRemoveProductImage,
      isPending: false,
    } as unknown as ReturnType<typeof useRemoveProductImageMutation>);
  });

  it('renders invalid-id state when route param is missing', () => {
    mockParams.id = '';

    render(<ProductEditPage />);

    expect(screen.getByText('Invalid product id')).toBeInTheDocument();
  });

  it('renders product error state when detail query fails', () => {
    mockedUseGetProductByIdQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Product detail failed'),
    } as unknown as ReturnType<typeof useGetProductByIdQuery>);

    render(<ProductEditPage />);

    expect(screen.getByText('Unable to load product')).toBeInTheDocument();
    expect(screen.getByText('Product detail failed')).toBeInTheDocument();
  });

  it('submits update mutation and remove-image action', () => {
    mockUpdateProduct.mockImplementation((_: unknown, options?: { onSuccess?: () => void }) => {
      options?.onSuccess?.();
    });

    render(<ProductEditPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit Product Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Product Image' }));

    expect(mockUpdateProduct).toHaveBeenCalledWith(
      {
        id: '42',
        payload: { name: 'Mapped Product Update' },
      },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
    expect(mockRemoveProductImage).toHaveBeenCalledWith(
      {
        productId: '42',
        imageId: 'img-1',
      },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
  });

  it('navigates back to products list on cancel', () => {
    render(<ProductEditPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel Product Edit' }));

    expect(mockNavigate).toHaveBeenCalledWith('/products?tab=products');
  });
});
