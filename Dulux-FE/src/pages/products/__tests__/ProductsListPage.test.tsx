import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useCreateSurfaceTypeMutation,
  useDeleteSurfaceTypeMutation,
  useGetProductsQuery,
  useGetSurfaceTypesQuery,
  useUpdateSurfaceTypeMutation,
} from '#/data-layer/products';
import { mapSurfaceTypeFormToPayload } from '#/hooks/products';
import { ProductsListPage } from '../ProductsListPage';

const mockSetSearchParams = vi.fn();
const mockCreateSurfaceType = vi.fn();
const mockUpdateSurfaceType = vi.fn();
const mockDeleteSurfaceType = vi.fn();

let currentSearchParams = new URLSearchParams('tab=products');

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useSearchParams: () => [currentSearchParams, mockSetSearchParams],
  };
});

vi.mock('#/hooks', () => ({
  useDebouncedValue: (value: string) => value,
}));

vi.mock('#/hooks/products', () => ({
  mapSurfaceTypeFormToPayload: vi.fn(),
}));

vi.mock('#/components/products', () => ({
  ProductTable: ({ products }: { products: Array<{ id: number }> }) => <div>Products Table {products.length}</div>,
  SurfaceTypeTable: ({
    surfaceTypes,
    onEdit,
    onDelete,
  }: {
    surfaceTypes: Array<{ id: number; name: string }>;
    linkedProductCountMap: Record<number, number>;
    onEdit: (surfaceType: { id: number; name: string; environment: 'INTERIOR' | 'EXTERIOR' }) => void;
    onDelete: (surfaceType: { id: number; name: string; environment: 'INTERIOR' | 'EXTERIOR' }) => void;
  }) => (
    <div>
      <p>Surface Types Table {surfaceTypes.length}</p>
      <button type='button' onClick={() => onEdit({ id: 2, name: 'Wood', environment: 'INTERIOR' })}>
        Edit Surface Type
      </button>
      <button type='button' onClick={() => onDelete({ id: 2, name: 'Wood', environment: 'INTERIOR' })}>
        Delete Surface Type
      </button>
    </div>
  ),
  SurfaceTypeModal: ({
    isOpen,
    onSubmit,
  }: {
    isOpen: boolean;
    isSubmitting: boolean;
    title: string;
    description: string;
    submitLabel: string;
    initialValues?: unknown;
    onClose: () => void;
    onSubmit: (values: unknown) => void;
  }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <button type='button' onClick={() => onSubmit({ name: 'Surface Payload', environment: 'INTERIOR' })}>
        Submit Surface Type
      </button>
    );
  },
  DeleteConfirmModal: ({
    isOpen,
    onConfirm,
  }: {
    isOpen: boolean;
    isSubmitting: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onClose: () => void;
    onConfirm: () => void;
  }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <button type='button' onClick={onConfirm}>
        Confirm Delete Surface Type
      </button>
    );
  },
}));

vi.mock('#/data-layer/products', () => ({
  useGetProductsQuery: vi.fn(),
  useGetSurfaceTypesQuery: vi.fn(),
  useCreateSurfaceTypeMutation: vi.fn(),
  useDeleteSurfaceTypeMutation: vi.fn(),
  useUpdateSurfaceTypeMutation: vi.fn(),
}));

const mockedUseGetProductsQuery = vi.mocked(useGetProductsQuery);
const mockedUseGetSurfaceTypesQuery = vi.mocked(useGetSurfaceTypesQuery);
const mockedUseCreateSurfaceTypeMutation = vi.mocked(useCreateSurfaceTypeMutation);
const mockedUseDeleteSurfaceTypeMutation = vi.mocked(useDeleteSurfaceTypeMutation);
const mockedUseUpdateSurfaceTypeMutation = vi.mocked(useUpdateSurfaceTypeMutation);
const mockedMapSurfaceTypeFormToPayload = vi.mocked(mapSurfaceTypeFormToPayload);

describe('ProductsListPage', () => {
  beforeEach(() => {
    mockSetSearchParams.mockReset();
    mockCreateSurfaceType.mockReset();
    mockUpdateSurfaceType.mockReset();
    mockDeleteSurfaceType.mockReset();
    currentSearchParams = new URLSearchParams('tab=products');

    mockedMapSurfaceTypeFormToPayload.mockReturnValue({
      name: 'Mapped Surface',
      environment: 'INTERIOR',
    });

    mockedUseGetProductsQuery.mockReturnValue({
      data: {
        results: [
          {
            id: 1,
            surfaceTypes: [{ id: 2 }],
          },
        ],
        count: 11,
        next: 'next-page',
      },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useGetProductsQuery>);

    mockedUseGetSurfaceTypesQuery.mockReturnValue({
      data: {
        results: [{ id: 2, name: 'Wood', environment: 'INTERIOR' }],
        count: 1,
        next: null,
      },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useGetSurfaceTypesQuery>);

    mockedUseCreateSurfaceTypeMutation.mockReturnValue({
      mutate: mockCreateSurfaceType,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateSurfaceTypeMutation>);

    mockedUseUpdateSurfaceTypeMutation.mockReturnValue({
      mutate: mockUpdateSurfaceType,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateSurfaceTypeMutation>);

    mockedUseDeleteSurfaceTypeMutation.mockReturnValue({
      mutate: mockDeleteSurfaceType,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteSurfaceTypeMutation>);
  });

  it('renders products tab content and pagination', () => {
    render(<ProductsListPage />);

    expect(screen.getByText('Products Table 1')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('renders product error state when products query fails', () => {
    mockedUseGetProductsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Products API unavailable'),
    } as unknown as ReturnType<typeof useGetProductsQuery>);

    render(<ProductsListPage />);

    expect(screen.getByText('Failed to load products')).toBeInTheDocument();
    expect(screen.getByText('Products API unavailable')).toBeInTheDocument();
  });

  it('switches to surface-type tab through search params update', () => {
    render(<ProductsListPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Surface Types' }));

    expect(mockSetSearchParams).toHaveBeenCalled();
  });

  it('submits create, update, and delete actions for surface types', () => {
    currentSearchParams = new URLSearchParams('tab=surface-types');

    render(<ProductsListPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Surface Type' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Surface Type' }));

    expect(mockCreateSurfaceType).toHaveBeenCalledWith(
      { name: 'Mapped Surface', environment: 'INTERIOR' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit Surface Type' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Surface Type' }));

    expect(mockUpdateSurfaceType).toHaveBeenCalledWith(
      {
        id: '2',
        payload: { name: 'Mapped Surface', environment: 'INTERIOR' },
      },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete Surface Type' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete Surface Type' }));

    expect(mockDeleteSurfaceType).toHaveBeenCalledWith(
      '2',
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
  });
});
