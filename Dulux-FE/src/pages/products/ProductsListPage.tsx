import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { DeleteConfirmModal, ProductTable, SurfaceTypeModal, SurfaceTypeTable } from '#/components/products';
import {
  Button,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '#/components/ui';
import { ROUTES } from '#/constants';
import {
  useCreateSurfaceTypeMutation,
  useDeleteProductMutation,
  useDeleteSurfaceTypeMutation,
  useGetProductsQuery,
  useGetSurfaceTypesQuery,
  useUpdateSurfaceTypeMutation,
} from '#/data-layer/products';
import { mapSurfaceTypeFormToPayload } from '#/hooks/products';
import type {
  Product,
  ProductEnvironment,
  ProductType,
  SurfaceType,
  SurfaceTypeFormValues,
  SurfaceTypeQueryParams,
} from '#/types/products';
import { cn, getApiErrorMessage } from '#/utils';

const FIRST_PAGE = 1;
const PRODUCT_PAGE_SIZE = 10;
const SURFACE_TYPE_PAGE_SIZE = 10;
const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_SURFACE_TYPES: SurfaceType[] = [];

type ProductTab = 'products' | 'surface-types';
type ProductTypeFilter = ProductType | 'ALL';
type ProductStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type ProductOrdering = 'name' | '-name' | 'created' | '-created';
type SurfaceEnvironmentFilter = ProductEnvironment | 'ALL';

const isProductTab = (value: string | null): value is ProductTab => {
  return value === 'products' || value === 'surface-types';
};

const isProductTypeFilter = (value: string | null): value is ProductTypeFilter => {
  return value === 'ALL' || value === 'TOPCOAT' || value === 'BASECOAT';
};

const isProductStatusFilter = (value: string | null): value is ProductStatusFilter => {
  return value === 'ALL' || value === 'ACTIVE' || value === 'INACTIVE';
};

const isProductOrdering = (value: string | null): value is ProductOrdering => {
  return value === 'name' || value === '-name' || value === 'created' || value === '-created';
};

const isSurfaceEnvironmentFilter = (value: string | null): value is SurfaceEnvironmentFilter => {
  return value === 'ALL' || value === 'INTERIOR' || value === 'EXTERIOR';
};

const parsePageFromSearchParam = (value: string | null): number => {
  const parsedPage = Number.parseInt(value ?? String(FIRST_PAGE), 10);
  return Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : FIRST_PAGE;
};

const buildSurfaceLinkedCountMap = (products: Product[]): Record<number, number> => {
  return products.reduce<Record<number, number>>((accumulator, product) => {
    product.surfaceTypes.forEach(surfaceType => {
      const currentCount = accumulator[surfaceType.id] ?? 0;
      accumulator[surfaceType.id] = currentCount + 1;
    });

    return accumulator;
  }, {});
};

export const ProductsListPage = (): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab: ProductTab = isProductTab(tabParam) ? tabParam : 'products';

  const [productSearch, setProductSearch] = useState<string>(() => searchParams.get('productSearch') ?? '');
  const [productTypeFilter, setProductTypeFilter] = useState<ProductTypeFilter>(() => {
    const value = searchParams.get('productType');
    return isProductTypeFilter(value) ? value : 'ALL';
  });
  const [productStatusFilter, setProductStatusFilter] = useState<ProductStatusFilter>(() => {
    const value = searchParams.get('productStatus');
    return isProductStatusFilter(value) ? value : 'ALL';
  });
  const [productOrdering, setProductOrdering] = useState<ProductOrdering>(() => {
    const value = searchParams.get('productOrdering');
    return isProductOrdering(value) ? value : '-created';
  });
  const [productPage, setProductPage] = useState<number>(() =>
    parsePageFromSearchParam(searchParams.get('productPage'))
  );

  const [surfaceSearch, setSurfaceSearch] = useState<string>(() => searchParams.get('surfaceSearch') ?? '');
  const [surfaceEnvironmentFilter, setSurfaceEnvironmentFilter] = useState<SurfaceEnvironmentFilter>(() => {
    const value = searchParams.get('surfaceEnvironment');
    return isSurfaceEnvironmentFilter(value) ? value : 'ALL';
  });
  const [surfacePage, setSurfacePage] = useState<number>(() =>
    parsePageFromSearchParam(searchParams.get('surfacePage'))
  );

  const [productDeleteTarget, setProductDeleteTarget] = useState<Product | null>(null);
  const [surfaceTypeDeleteTarget, setSurfaceTypeDeleteTarget] = useState<SurfaceType | null>(null);

  const [isSurfaceTypeModalOpen, setSurfaceTypeModalOpen] = useState<boolean>(false);
  const [surfaceTypeEditTarget, setSurfaceTypeEditTarget] = useState<SurfaceType | null>(null);

  const productQuery = useGetProductsQuery({
    search: productSearch.trim() || undefined,
    product_type: productTypeFilter === 'ALL' ? undefined : productTypeFilter,
    is_active: productStatusFilter === 'ALL' ? undefined : productStatusFilter === 'ACTIVE',
    ordering: productOrdering,
    page_size: PRODUCT_PAGE_SIZE,
    page: productPage,
  });

  const surfaceTypeParams: SurfaceTypeQueryParams = {
    search: surfaceSearch.trim() || undefined,
    environment: surfaceEnvironmentFilter === 'ALL' ? undefined : surfaceEnvironmentFilter,
    page: surfacePage,
    page_size: SURFACE_TYPE_PAGE_SIZE,
  };

  const surfaceTypesQuery = useGetSurfaceTypesQuery(surfaceTypeParams);

  const createSurfaceTypeMutation = useCreateSurfaceTypeMutation();
  const updateSurfaceTypeMutation = useUpdateSurfaceTypeMutation();
  const deleteProductMutation = useDeleteProductMutation();
  const deleteSurfaceTypeMutation = useDeleteSurfaceTypeMutation();

  const products = productQuery.data?.results ?? EMPTY_PRODUCTS;
  const surfaceTypes = surfaceTypesQuery.data?.results ?? EMPTY_SURFACE_TYPES;
  const productTotalItems = productQuery.data?.count ?? 0;
  const productTotalPages = Math.max(1, Math.ceil(productTotalItems / PRODUCT_PAGE_SIZE));
  const surfaceTypeTotalItems = surfaceTypesQuery.data?.count ?? 0;
  const surfaceTypeTotalPages = Math.max(1, Math.ceil(surfaceTypeTotalItems / SURFACE_TYPE_PAGE_SIZE));

  const linkedProductCountMap = useMemo<Record<number, number>>(() => {
    return buildSurfaceLinkedCountMap(products);
  }, [products]);
  const searchParamsString = searchParams.toString();

  useEffect(() => {
    const nextParams = new URLSearchParams();
    nextParams.set('tab', activeTab);

    if (productSearch.trim().length > 0) {
      nextParams.set('productSearch', productSearch.trim());
    }
    if (productTypeFilter !== 'ALL') {
      nextParams.set('productType', productTypeFilter);
    }
    if (productStatusFilter !== 'ALL') {
      nextParams.set('productStatus', productStatusFilter);
    }
    if (productOrdering !== '-created') {
      nextParams.set('productOrdering', productOrdering);
    }
    if (productPage !== FIRST_PAGE) {
      nextParams.set('productPage', String(productPage));
    }
    if (surfaceSearch.trim().length > 0) {
      nextParams.set('surfaceSearch', surfaceSearch.trim());
    }
    if (surfaceEnvironmentFilter !== 'ALL') {
      nextParams.set('surfaceEnvironment', surfaceEnvironmentFilter);
    }
    if (surfacePage !== FIRST_PAGE) {
      nextParams.set('surfacePage', String(surfacePage));
    }

    if (nextParams.toString() !== searchParamsString) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    activeTab,
    productOrdering,
    productPage,
    productSearch,
    productStatusFilter,
    productTypeFilter,
    searchParamsString,
    setSearchParams,
    surfaceEnvironmentFilter,
    surfacePage,
    surfaceSearch,
  ]);

  const setTab = (tab: ProductTab): void => {
    setSearchParams(previous => {
      const nextParams = new URLSearchParams(previous);
      nextParams.set('tab', tab);
      return nextParams;
    });
  };

  const handleGoToProductCreate = (): void => {
    navigate(`${ROUTES.PRODUCT_NEW}${location.search}`);
  };

  const handleProductSearchChange = (value: string): void => {
    setProductSearch(value);
    setProductPage(FIRST_PAGE);
  };

  const handleProductTypeFilterChange = (value: string): void => {
    setProductTypeFilter(value === 'ALL' ? 'ALL' : (value as ProductType));
    setProductPage(FIRST_PAGE);
  };

  const handleProductStatusFilterChange = (value: string): void => {
    setProductStatusFilter(value as ProductStatusFilter);
    setProductPage(FIRST_PAGE);
  };

  const handleProductOrderingChange = (value: string): void => {
    setProductOrdering(value as ProductOrdering);
    setProductPage(FIRST_PAGE);
  };

  const requestProductDelete = (product: Product): void => {
    setProductDeleteTarget(product);
  };

  const closeProductDeleteModal = (): void => {
    setProductDeleteTarget(null);
  };

  const confirmDeleteProduct = (): void => {
    if (!productDeleteTarget) {
      return;
    }

    deleteProductMutation.mutate(String(productDeleteTarget.id), {
      onSuccess: () => {
        toast.success('Product deleted successfully.');
        closeProductDeleteModal();
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  const openCreateSurfaceTypeModal = (): void => {
    setSurfaceTypeEditTarget(null);
    setSurfaceTypeModalOpen(true);
  };

  const openEditSurfaceTypeModal = (surfaceType: SurfaceType): void => {
    setSurfaceTypeEditTarget(surfaceType);
    setSurfaceTypeModalOpen(true);
  };

  const closeSurfaceTypeModal = (): void => {
    setSurfaceTypeModalOpen(false);
    setSurfaceTypeEditTarget(null);
  };

  const submitSurfaceType = (values: SurfaceTypeFormValues): void => {
    if (surfaceTypeEditTarget) {
      updateSurfaceTypeMutation.mutate(
        {
          id: String(surfaceTypeEditTarget.id),
          payload: mapSurfaceTypeFormToPayload(values),
        },
        {
          onSuccess: () => {
            toast.success('Surface type updated successfully.');
            closeSurfaceTypeModal();
          },
          onError: error => {
            toast.error(getApiErrorMessage(error));
          },
        }
      );

      return;
    }

    createSurfaceTypeMutation.mutate(mapSurfaceTypeFormToPayload(values), {
      onSuccess: () => {
        toast.success('Surface type created successfully.');
        closeSurfaceTypeModal();
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  const handleSurfaceSearchChange = (value: string): void => {
    setSurfaceSearch(value);
    setSurfacePage(FIRST_PAGE);
  };

  const handleSurfaceEnvironmentFilterChange = (value: string): void => {
    setSurfaceEnvironmentFilter(value as SurfaceEnvironmentFilter);
    setSurfacePage(FIRST_PAGE);
  };

  const requestSurfaceTypeDelete = (surfaceType: SurfaceType): void => {
    setSurfaceTypeDeleteTarget(surfaceType);
  };

  const closeSurfaceTypeDeleteModal = (): void => {
    setSurfaceTypeDeleteTarget(null);
  };

  const confirmDeleteSurfaceType = (): void => {
    if (!surfaceTypeDeleteTarget) {
      return;
    }

    deleteSurfaceTypeMutation.mutate(String(surfaceTypeDeleteTarget.id), {
      onSuccess: () => {
        toast.success('Surface type deleted successfully.');
        closeSurfaceTypeDeleteModal();
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  const goToProductNextPage = (): void => {
    if (productQuery.data?.next) {
      setProductPage(previousPage => previousPage + 1);
    }
  };

  const goToProductPreviousPage = (): void => {
    if (productPage > FIRST_PAGE) {
      setProductPage(previousPage => previousPage - 1);
    }
  };

  const goToSurfaceNextPage = (): void => {
    if (surfaceTypesQuery.data?.next) {
      setSurfacePage(previousPage => previousPage + 1);
    }
  };

  const goToSurfacePreviousPage = (): void => {
    if (surfacePage > FIRST_PAGE) {
      setSurfacePage(previousPage => previousPage - 1);
    }
  };

  return (
    <section className='space-y-4'>
      <header className='relative overflow-hidden rounded-3xl border border-primary/20 bg-[linear-gradient(120deg,#0d4ea8_0%,#2a7ddb_45%,#7fc5ff_100%)] p-5 text-white md:p-6'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,rgba(255,255,255,0.32),transparent_42%)]'
        />
        <div className='relative space-y-1'>
          <p className='text-xs font-semibold uppercase tracking-[2px] text-blue-100'>Catalog Operations</p>
          <h2 className='text-2xl font-extrabold tracking-tight text-white'>Product Catalog</h2>
          <p className='text-sm text-blue-50/90'>Manage products and surface types from one catalog view.</p>
        </div>
      </header>

      <section className='wf-tabs-panel border-primary/15 bg-white/80 shadow-[0_10px_24px_rgba(19,87,167,0.08)] backdrop-blur'>
        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            className={cn('wf-filter-tab', activeTab === 'products' ? 'wf-filter-tab-active' : '')}
            onClick={() => setTab('products')}
          >
            Products
          </button>
          <button
            type='button'
            className={cn('wf-filter-tab', activeTab === 'surface-types' ? 'wf-filter-tab-active' : '')}
            onClick={() => setTab('surface-types')}
          >
            Surface Types
          </button>
        </div>
      </section>

      {activeTab === 'products' ? (
        <>
          <section className='wf-toolbar-panel border-primary/15 bg-[linear-gradient(170deg,#ffffff_0%,#f1f7ff_100%)] shadow-[0_10px_24px_rgba(19,87,167,0.08)]'>
            <div className='grid items-center gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]'>
              <Input
                type='search'
                value={productSearch}
                onChange={event => handleProductSearchChange(event.target.value)}
                placeholder='Search by product name'
                className='h-11 rounded-xl border-primary/25 bg-white'
                aria-label='Search products'
              />
              <Select value={productTypeFilter} onValueChange={handleProductTypeFilterChange}>
                <SelectTrigger aria-label='Filter products by type'>
                  <SelectValue placeholder='Type: All' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>Type: All</SelectItem>
                  <SelectItem value='TOPCOAT'>Topcoat</SelectItem>
                  <SelectItem value='BASECOAT'>Basecoat</SelectItem>
                </SelectContent>
              </Select>
              <Select value={productStatusFilter} onValueChange={handleProductStatusFilterChange}>
                <SelectTrigger aria-label='Filter products by status'>
                  <SelectValue placeholder='Status: All' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>Status: All</SelectItem>
                  <SelectItem value='ACTIVE'>Active</SelectItem>
                  <SelectItem value='INACTIVE'>Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={productOrdering} onValueChange={handleProductOrderingChange}>
                <SelectTrigger aria-label='Order products'>
                  <SelectValue placeholder='Order By' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='-created'>Newest first</SelectItem>
                  <SelectItem value='created'>Oldest first</SelectItem>
                  <SelectItem value='name'>Name (A-Z)</SelectItem>
                  <SelectItem value='-name'>Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
              <div className='flex h-11 items-center justify-end'>
                <Button
                  type='button'
                  className='h-11 rounded-xl border border-[#0b1f3a] bg-[#0b1f3a] px-5 text-white shadow-[0_12px_24px_rgba(8,24,46,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#08182e] hover:shadow-[0_16px_30px_rgba(8,24,46,0.45)]'
                  onClick={handleGoToProductCreate}
                >
                  Add Product
                </Button>
              </div>
            </div>
          </section>

          {productQuery.isLoading ? (
            <section className='space-y-2 wf-card wf-card-p4'>
              <Skeleton className='h-9 w-full' />
              <Skeleton className='h-9 w-full' />
              <Skeleton className='h-9 w-full' />
            </section>
          ) : null}

          {productQuery.isError ? (
            <Empty>
              <EmptyContent>
                <EmptyHeader>
                  <EmptyTitle>Failed to load products</EmptyTitle>
                  <EmptyDescription>{productQuery.error?.message ?? 'Unable to fetch products.'}</EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : null}

          {!productQuery.isLoading && !productQuery.isError && products.length === 0 ? (
            <Empty>
              <EmptyContent>
                <EmptyHeader>
                  <EmptyTitle>No products found</EmptyTitle>
                  <EmptyDescription>Try adjusting your filters.</EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : null}

          {!productQuery.isLoading && !productQuery.isError && products.length > 0 ? (
            <>
              <ProductTable products={products} onDelete={requestProductDelete} />

              <section className='wf-pagination-panel'>
                <p className='text-sm text-text-muted'>
                  Page {productPage} of {productTotalPages}
                </p>
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={productPage <= FIRST_PAGE}
                    onClick={goToProductPreviousPage}
                  >
                    Previous
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={!productQuery.data?.next}
                    onClick={goToProductNextPage}
                  >
                    Next
                  </Button>
                </div>
              </section>
            </>
          ) : null}
        </>
      ) : (
        <>
          <section className='wf-toolbar-panel border-primary/15 bg-[linear-gradient(170deg,#ffffff_0%,#f1f7ff_100%)] shadow-[0_10px_24px_rgba(19,87,167,0.08)]'>
            <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-[2fr_1fr_auto]'>
              <Input
                type='search'
                value={surfaceSearch}
                onChange={event => handleSurfaceSearchChange(event.target.value)}
                placeholder='Search by surface name'
                className='h-11 rounded-xl border-primary/25 bg-white'
                aria-label='Search surface types'
              />
              <Select value={surfaceEnvironmentFilter} onValueChange={handleSurfaceEnvironmentFilterChange}>
                <SelectTrigger aria-label='Filter surface types by category'>
                  <SelectValue placeholder='Category: All' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>Category: All</SelectItem>
                  <SelectItem value='INTERIOR'>Interior</SelectItem>
                  <SelectItem value='EXTERIOR'>Exterior</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type='button'
                className='h-10 rounded-xl border border-[#0b1f3a] bg-[#0b1f3a] text-white shadow-[0_12px_24px_rgba(8,24,46,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#08182e] hover:shadow-[0_16px_30px_rgba(8,24,46,0.45)]'
                onClick={openCreateSurfaceTypeModal}
              >
                Add Surface Type
              </Button>
            </div>
          </section>

          {surfaceTypesQuery.isLoading ? (
            <section className='space-y-2 wf-card wf-card-p4'>
              <Skeleton className='h-9 w-full' />
              <Skeleton className='h-9 w-full' />
              <Skeleton className='h-9 w-full' />
            </section>
          ) : null}

          {surfaceTypesQuery.isError ? (
            <Empty>
              <EmptyContent>
                <EmptyHeader>
                  <EmptyTitle>Failed to load surface types</EmptyTitle>
                  <EmptyDescription>
                    {surfaceTypesQuery.error?.message ?? 'Unable to fetch surface types.'}
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : null}

          {!surfaceTypesQuery.isLoading && !surfaceTypesQuery.isError && surfaceTypes.length === 0 ? (
            <Empty>
              <EmptyContent>
                <EmptyHeader>
                  <EmptyTitle>No surface types found</EmptyTitle>
                  <EmptyDescription>Add a surface type to continue.</EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          ) : null}

          {!surfaceTypesQuery.isLoading && !surfaceTypesQuery.isError && surfaceTypes.length > 0 ? (
            <>
              <SurfaceTypeTable
                surfaceTypes={surfaceTypes}
                linkedProductCountMap={linkedProductCountMap}
                onEdit={openEditSurfaceTypeModal}
                onDelete={requestSurfaceTypeDelete}
              />

              <section className='wf-pagination-panel'>
                <p className='text-sm text-text-muted'>
                  Page {surfacePage} of {surfaceTypeTotalPages}
                </p>
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={surfacePage <= FIRST_PAGE}
                    onClick={goToSurfacePreviousPage}
                  >
                    Previous
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={!surfaceTypesQuery.data?.next}
                    onClick={goToSurfaceNextPage}
                  >
                    Next
                  </Button>
                </div>
              </section>
            </>
          ) : null}
        </>
      )}

      <SurfaceTypeModal
        isOpen={isSurfaceTypeModalOpen}
        isSubmitting={createSurfaceTypeMutation.isPending || updateSurfaceTypeMutation.isPending}
        title={surfaceTypeEditTarget ? 'Edit Surface Type' : 'Add Surface Type'}
        description='Provide a name and category for this surface type.'
        initialValues={
          surfaceTypeEditTarget
            ? {
                name: surfaceTypeEditTarget.name,
                environment: surfaceTypeEditTarget.environment,
                description: '',
                status: 'ACTIVE',
              }
            : undefined
        }
        submitLabel={surfaceTypeEditTarget ? 'Save Changes' : 'Add Surface Type'}
        onClose={closeSurfaceTypeModal}
        onSubmit={submitSurfaceType}
      />

      <DeleteConfirmModal
        isOpen={Boolean(productDeleteTarget)}
        isSubmitting={deleteProductMutation.isPending}
        title='Delete Product'
        description={
          productDeleteTarget
            ? `Are you sure you want to delete "${productDeleteTarget.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this product?'
        }
        onClose={closeProductDeleteModal}
        onConfirm={confirmDeleteProduct}
      />

      <DeleteConfirmModal
        isOpen={Boolean(surfaceTypeDeleteTarget)}
        isSubmitting={deleteSurfaceTypeMutation.isPending}
        title='Delete Surface Type'
        description={
          surfaceTypeDeleteTarget
            ? `Are you sure you want to delete "${surfaceTypeDeleteTarget.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this surface type?'
        }
        onClose={closeSurfaceTypeDeleteModal}
        onConfirm={confirmDeleteSurfaceType}
      />
    </section>
  );
};
