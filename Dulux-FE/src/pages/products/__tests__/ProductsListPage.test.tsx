import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PRODUCTS_LIST_TABS } from '#/constants';
import { useProductsListPageController } from '#/hooks/products';
import { ProductsListPage } from '../ProductsListPage';

const mockSetProductsTab = vi.fn();
const mockSetSurfaceTypesTab = vi.fn();
const mockOpenCreateSurfaceTypeModal = vi.fn();
const mockOpenEditSurfaceTypeModal = vi.fn();
const mockOpenDeleteSurfaceTypeModal = vi.fn();
const mockSubmitSurfaceType = vi.fn();
const mockHandleDeleteSurfaceType = vi.fn();

vi.mock('#/hooks/products', () => ({
  useProductsListPageController: vi.fn(),
}));

vi.mock('../components', () => ({
  ProductsTabContainer: ({
    errorMessage,
    isError,
    productPage,
    productTotalPages,
    products,
  }: {
    errorMessage: string;
    hasNextPage: boolean;
    isError: boolean;
    isLoading: boolean;
    onNextPage: () => void;
    onPreviousPage: () => void;
    onProductOrderingChange: (value: string) => void;
    onProductSearchChange: (value: string) => void;
    onProductStatusFilterChange: (value: string) => void;
    onProductTypeFilterChange: (value: string) => void;
    productOrdering: string;
    productPage: number;
    productSearch: string;
    products: Array<{ id: number }>;
    productStatusFilter: string;
    productTotalPages: number;
    productTypeFilter: string;
  }) => (
    <div>
      <p>Products Table {products.length}</p>
      <p>
        Page {productPage} of {productTotalPages}
      </p>
      {isError ? <p>Failed to load products</p> : null}
      {isError ? <p>{errorMessage}</p> : null}
    </div>
  ),
  SurfaceTypesTabContainer: ({
    onOpenCreateSurfaceTypeModal,
    onOpenDeleteSurfaceTypeModal,
    onOpenEditSurfaceTypeModal,
    surfaceTypes,
  }: {
    errorMessage: string;
    hasNextPage: boolean;
    isError: boolean;
    isLoading: boolean;
    onNextPage: () => void;
    onOpenCreateSurfaceTypeModal: () => void;
    onOpenDeleteSurfaceTypeModal: (surfaceType: {
      environment: 'EXTERIOR' | 'INTERIOR';
      id: number;
      name: string;
    }) => void;
    onOpenEditSurfaceTypeModal: (surfaceType: {
      environment: 'EXTERIOR' | 'INTERIOR';
      id: number;
      name: string;
    }) => void;
    onPreviousPage: () => void;
    onSurfaceEnvironmentFilterChange: (value: string) => void;
    onSurfaceSearchChange: (value: string) => void;
    surfaceEnvironmentFilter: string;
    surfacePage: number;
    surfaceSearch: string;
    surfaceTypeTotalPages: number;
    surfaceTypes: Array<{ environment: 'EXTERIOR' | 'INTERIOR'; id: number; name: string }>;
  }) => (
    <div>
      <p>Surface Types Table {surfaceTypes.length}</p>
      <button type='button' onClick={onOpenCreateSurfaceTypeModal}>
        Add Surface Type
      </button>
      <button
        type='button'
        onClick={() => onOpenEditSurfaceTypeModal({ id: 2, name: 'Wood', environment: 'INTERIOR' })}
      >
        Edit Surface Type
      </button>
      <button
        type='button'
        onClick={() => onOpenDeleteSurfaceTypeModal({ id: 2, name: 'Wood', environment: 'INTERIOR' })}
      >
        Delete Surface Type
      </button>
    </div>
  ),
}));

vi.mock('#/components/products', () => ({
  DeleteConfirmModal: ({
    isOpen,
    onConfirm,
  }: {
    confirmLabel: string;
    description: string;
    isOpen: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
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
  SurfaceTypeModal: ({
    isOpen,
    onSubmit,
  }: {
    description: string;
    initialValues?: unknown;
    isOpen: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (values: unknown) => void;
    submitLabel: string;
    title: string;
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
}));

const mockedUseProductsListPageController = vi.mocked(useProductsListPageController);

const buildControllerState = (
  overrides: Partial<ReturnType<typeof useProductsListPageController>> = {}
): ReturnType<typeof useProductsListPageController> => {
  return {
    activeTab: PRODUCTS_LIST_TABS.PRODUCTS,
    hasProductNextPage: true,
    hasSurfaceTypesNextPage: false,
    isProductError: false,
    isProductLoading: false,
    isSurfaceTypeDeletePending: false,
    isSurfaceTypeModalOpen: false,
    isSurfaceTypeSubmitting: false,
    isSurfaceTypesError: false,
    isSurfaceTypesLoading: false,
    linkedProductCountMap: {},
    productErrorMessage: '',
    productOrdering: '-created_at',
    productPage: 1,
    products: [{ id: 1 }],
    productSearch: '',
    productStatusFilter: 'all',
    productTotalPages: 2,
    productTypeFilter: 'all',
    surfaceEnvironmentFilter: 'all',
    surfacePage: 1,
    surfaceSearch: '',
    surfaceTypeDeleteTarget: null,
    surfaceTypeEditTarget: null,
    surfaceTypes: [{ id: 2, name: 'Wood', environment: 'INTERIOR' }],
    surfaceTypesErrorMessage: '',
    surfaceTypeTotalPages: 1,
    closeDeleteSurfaceTypeModal: vi.fn(),
    closeSurfaceTypeModal: vi.fn(),
    goToProductNextPage: vi.fn(),
    goToProductPreviousPage: vi.fn(),
    goToSurfaceNextPage: vi.fn(),
    goToSurfacePreviousPage: vi.fn(),
    handleDeleteSurfaceType: mockHandleDeleteSurfaceType,
    handleProductOrderingChange: vi.fn(),
    handleProductSearchChange: vi.fn(),
    handleProductStatusFilterChange: vi.fn(),
    handleProductTypeFilterChange: vi.fn(),
    handleSurfaceEnvironmentFilterChange: vi.fn(),
    handleSurfaceSearchChange: vi.fn(),
    openCreateSurfaceTypeModal: mockOpenCreateSurfaceTypeModal,
    openDeleteSurfaceTypeModal: mockOpenDeleteSurfaceTypeModal,
    openEditSurfaceTypeModal: mockOpenEditSurfaceTypeModal,
    setProductsTab: mockSetProductsTab,
    setSurfaceTypesTab: mockSetSurfaceTypesTab,
    submitSurfaceType: mockSubmitSurfaceType,
    ...overrides,
  } as ReturnType<typeof useProductsListPageController>;
};

describe('ProductsListPage', () => {
  beforeEach(() => {
    mockSetProductsTab.mockReset();
    mockSetSurfaceTypesTab.mockReset();
    mockOpenCreateSurfaceTypeModal.mockReset();
    mockOpenEditSurfaceTypeModal.mockReset();
    mockOpenDeleteSurfaceTypeModal.mockReset();
    mockSubmitSurfaceType.mockReset();
    mockHandleDeleteSurfaceType.mockReset();

    mockedUseProductsListPageController.mockReturnValue(buildControllerState());
  });

  it('renders products tab content and pagination', () => {
    render(<ProductsListPage />);

    expect(screen.getByText('Products Table 1')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('renders product error state when products query fails', () => {
    mockedUseProductsListPageController.mockReturnValue(
      buildControllerState({
        isProductError: true,
        productErrorMessage: 'Products API unavailable',
      })
    );

    render(<ProductsListPage />);

    expect(screen.getByText('Failed to load products')).toBeInTheDocument();
    expect(screen.getByText('Products API unavailable')).toBeInTheDocument();
  });

  it('switches to surface-type tab via controller handler', () => {
    render(<ProductsListPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Surface Types' }));

    expect(mockSetSurfaceTypesTab).toHaveBeenCalledTimes(1);
  });

  it('submits modal actions and surface-type open handlers', () => {
    mockedUseProductsListPageController.mockReturnValue(
      buildControllerState({
        activeTab: PRODUCTS_LIST_TABS.SURFACE_TYPES,
        isSurfaceTypeModalOpen: true,
        surfaceTypeDeleteTarget: { id: 2, name: 'Wood', environment: 'INTERIOR' },
      })
    );

    render(<ProductsListPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Surface Type' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Surface Type' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Surface Type' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Surface Type' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete Surface Type' }));

    expect(mockOpenCreateSurfaceTypeModal).toHaveBeenCalledTimes(1);
    expect(mockOpenEditSurfaceTypeModal).toHaveBeenCalledWith({ id: 2, name: 'Wood', environment: 'INTERIOR' });
    expect(mockOpenDeleteSurfaceTypeModal).toHaveBeenCalledWith({ id: 2, name: 'Wood', environment: 'INTERIOR' });
    expect(mockSubmitSurfaceType).toHaveBeenCalledWith({ name: 'Surface Payload', environment: 'INTERIOR' });
    expect(mockHandleDeleteSurfaceType).toHaveBeenCalledTimes(1);
  });
});
