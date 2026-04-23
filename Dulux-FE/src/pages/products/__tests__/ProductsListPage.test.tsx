import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useCreateSurfaceTypeMutation,
  useDeleteSurfaceTypeMutation,
  useGetProductsQuery,
  useGetSurfaceTypesQuery,
  useUpdateSurfaceTypeMutation,
} from '#/data-layer/products';
import { useDebouncedValue } from '#/hooks';
import { ProductsListPage } from '../ProductsListPage';

const mockSetSearchParams = vi.fn();

let searchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useSearchParams: () => [searchParams, mockSetSearchParams],
  };
});

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('#/components/products', () => ({
  ProductTable: ({ products }: { products: Array<{ id: number }> }) => <div>Product Table {products.length}</div>,
  SurfaceTypeTable: ({ surfaceTypes }: { surfaceTypes: Array<{ id: number }> }) => (
    <div>Surface Table {surfaceTypes.length}</div>
  ),
  SurfaceTypeModal: () => null,
  DeleteConfirmModal: () => null,
}));

vi.mock('#/hooks', () => ({
  useDebouncedValue: vi.fn(),
}));

vi.mock('#/data-layer/products', () => ({
  useGetProductsQuery: vi.fn(),
  useGetSurfaceTypesQuery: vi.fn(),
  useCreateSurfaceTypeMutation: vi.fn(),
  useDeleteSurfaceTypeMutation: vi.fn(),
  useUpdateSurfaceTypeMutation: vi.fn(),
}));

const mockedUseDebouncedValue = vi.mocked(useDebouncedValue);
const mockedUseGetProductsQuery = vi.mocked(useGetProductsQuery);
const mockedUseGetSurfaceTypesQuery = vi.mocked(useGetSurfaceTypesQuery);
const mockedUseCreateSurfaceTypeMutation = vi.mocked(useCreateSurfaceTypeMutation);
const mockedUseDeleteSurfaceTypeMutation = vi.mocked(useDeleteSurfaceTypeMutation);
const mockedUseUpdateSurfaceTypeMutation = vi.mocked(useUpdateSurfaceTypeMutation);

const createPendingMutation = () => ({
  mutate: vi.fn(),
  isPending: false,
});

describe('ProductsListPage', () => {
  beforeEach(() => {
    searchParams = new URLSearchParams('tab=products');
    mockSetSearchParams.mockReset();

    mockedUseDebouncedValue.mockImplementation(value => value);
    mockedUseGetProductsQuery.mockReturnValue({
      data: {
        results: [{ id: 1, surfaceTypes: [] }],
        count: 12,
        next: '/api/next',
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useGetProductsQuery>);

    mockedUseGetSurfaceTypesQuery.mockReturnValue({
      data: {
        results: [{ id: 21 }],
        count: 1,
        next: null,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useGetSurfaceTypesQuery>);

    mockedUseCreateSurfaceTypeMutation.mockReturnValue(
      createPendingMutation() as unknown as ReturnType<typeof useCreateSurfaceTypeMutation>
    );
    mockedUseDeleteSurfaceTypeMutation.mockReturnValue(
      createPendingMutation() as unknown as ReturnType<typeof useDeleteSurfaceTypeMutation>
    );
    mockedUseUpdateSurfaceTypeMutation.mockReturnValue(
      createPendingMutation() as unknown as ReturnType<typeof useUpdateSurfaceTypeMutation>
    );
  });

  it('renders products tab by default', () => {
    render(<ProductsListPage />);

    expect(screen.getByRole('button', { name: 'Products' })).toBeInTheDocument();
    expect(screen.getByText('Product Table 1')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('renders product error state', () => {
    mockedUseGetProductsQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('Products down'),
    } as unknown as ReturnType<typeof useGetProductsQuery>);

    render(<ProductsListPage />);

    expect(screen.getByText('Failed to load products')).toBeInTheDocument();
    expect(screen.getByText('Products down')).toBeInTheDocument();
  });

  it('renders surface-types tab content', () => {
    searchParams = new URLSearchParams('tab=surface-types');

    render(<ProductsListPage />);

    expect(screen.getByRole('button', { name: 'Surface Types' })).toBeInTheDocument();
    expect(screen.getByText('Surface Table 1')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });
});
