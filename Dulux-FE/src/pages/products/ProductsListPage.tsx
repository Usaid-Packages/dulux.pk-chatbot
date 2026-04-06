import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { getApiErrorMessage } from '#/utils';

const FIRST_PAGE = 1;
const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_SURFACE_TYPES: SurfaceType[] = [];

type ProductTab = 'products' | 'surface-types';
type ProductTypeFilter = ProductType | 'ALL';
type ProductStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type SurfaceEnvironmentFilter = ProductEnvironment | 'ALL';

const isProductTab = (value: string | null): value is ProductTab => {
  return value === 'products' || value === 'surface-types';
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = isProductTab(searchParams.get('tab')) ? searchParams.get('tab') : 'products';

  const [productSearch, setProductSearch] = useState<string>('');
  const [productTypeFilter, setProductTypeFilter] = useState<ProductTypeFilter>('ALL');
  const [productStatusFilter, setProductStatusFilter] = useState<ProductStatusFilter>('ALL');
  const [productPage, setProductPage] = useState<number>(FIRST_PAGE);

  const [surfaceSearch, setSurfaceSearch] = useState<string>('');
  const [surfaceEnvironmentFilter, setSurfaceEnvironmentFilter] = useState<SurfaceEnvironmentFilter>('ALL');
  const [surfacePage, setSurfacePage] = useState<number>(FIRST_PAGE);

  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  const [productDeleteTarget, setProductDeleteTarget] = useState<Product | null>(null);
  const [surfaceTypeDeleteTarget, setSurfaceTypeDeleteTarget] = useState<SurfaceType | null>(null);

  const [isSurfaceTypeModalOpen, setSurfaceTypeModalOpen] = useState<boolean>(false);
  const [surfaceTypeEditTarget, setSurfaceTypeEditTarget] = useState<SurfaceType | null>(null);

  const productQuery = useGetProductsQuery({
    search: productSearch.trim() || undefined,
    product_type: productTypeFilter === 'ALL' ? undefined : productTypeFilter,
    is_active: productStatusFilter === 'ALL' ? undefined : productStatusFilter === 'ACTIVE',
    page: productPage,
  });

  const surfaceTypeParams: SurfaceTypeQueryParams = {
    search: surfaceSearch.trim() || undefined,
    environment: surfaceEnvironmentFilter === 'ALL' ? undefined : surfaceEnvironmentFilter,
    page: surfacePage,
  };

  const surfaceTypesQuery = useGetSurfaceTypesQuery(surfaceTypeParams);

  const createSurfaceTypeMutation = useCreateSurfaceTypeMutation();
  const updateSurfaceTypeMutation = useUpdateSurfaceTypeMutation();
  const deleteProductMutation = useDeleteProductMutation();
  const deleteSurfaceTypeMutation = useDeleteSurfaceTypeMutation();

  const products = productQuery.data?.results ?? EMPTY_PRODUCTS;
  const surfaceTypes = surfaceTypesQuery.data?.results ?? EMPTY_SURFACE_TYPES;

  const linkedProductCountMap = useMemo<Record<number, number>>(() => {
    return buildSurfaceLinkedCountMap(products);
  }, [products]);

  useEffect(() => {
    const visibleIds = new Set(products.map(product => product.id));
    setSelectedProductIds(previousIds => {
      const nextIds = previousIds.filter(id => visibleIds.has(id));

      if (nextIds.length === previousIds.length && nextIds.every((id, index) => id === previousIds[index])) {
        return previousIds;
      }

      return nextIds;
    });
  }, [products]);

  const setTab = (tab: ProductTab): void => {
    setSearchParams({ tab });
  };

  const handleExportProducts = (): void => {
    if (products.length === 0) {
      toast.info('No products available to export.');
      return;
    }

    const header = ['ID', 'Name', 'Type', 'Warranty Years', 'Coverage', 'Status', 'Surface Types', 'URL'];
    const rows = products.map(product => [
      String(product.id),
      product.name,
      product.productType,
      String(product.warrantyYears),
      product.coverageDetails,
      product.isActive ? 'Active' : 'Inactive',
      product.surfaceTypes.map(surfaceType => surfaceType.name).join('; '),
      product.webpageUrl,
    ]);

    const csv = [header, ...rows]
      .map(row => row.map(column => `"${String(column).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  };

  const handleGoToProductCreate = (): void => {
    navigate(ROUTES.PRODUCT_NEW);
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

  const handleToggleAllProducts = (checked: boolean): void => {
    if (!checked) {
      setSelectedProductIds([]);
      return;
    }

    setSelectedProductIds(products.map(product => product.id));
  };

  const handleToggleProduct = (id: number, checked: boolean): void => {
    setSelectedProductIds(previousIds => {
      if (checked) {
        return previousIds.includes(id) ? previousIds : [...previousIds, id];
      }

      return previousIds.filter(currentId => currentId !== id);
    });
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
      <header className='space-y-1'>
        <h2 className='text-2xl font-semibold text-text-primary'>Product Catalog</h2>
        <p className='text-sm text-text-muted'>Manage products and surface types from one catalog view.</p>
      </header>

      <section className='wf-tabs-panel'>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='ghost'
            className={activeTab === 'products' ? 'wf-pill-tab wf-pill-tab-active' : 'wf-pill-tab'}
            onClick={() => setTab('products')}
          >
            Products ({productQuery.data?.count ?? 0})
          </Button>
          <Button
            type='button'
            variant='ghost'
            className={activeTab === 'surface-types' ? 'wf-pill-tab wf-pill-tab-active' : 'wf-pill-tab'}
            onClick={() => setTab('surface-types')}
          >
            Surface Types ({surfaceTypesQuery.data?.count ?? 0})
          </Button>
        </div>
      </section>

      {activeTab === 'products' ? (
        <>
          <section className='wf-toolbar-panel'>
            <div className='grid gap-3 md:grid-cols-[2fr,1fr,1fr,auto]'>
              <Input
                type='search'
                value={productSearch}
                onChange={event => handleProductSearchChange(event.target.value)}
                placeholder='Search by product name'
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
              <div className='flex items-center justify-end gap-2'>
                <Button type='button' variant='outline'>
                  Filters
                </Button>
                <Button type='button' variant='outline' onClick={handleExportProducts}>
                  Export
                </Button>
                <Button type='button' onClick={handleGoToProductCreate}>
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
              <ProductTable
                products={products}
                selectedProductIds={selectedProductIds}
                onToggleAll={handleToggleAllProducts}
                onToggleOne={handleToggleProduct}
                onDelete={requestProductDelete}
              />

              <section className='wf-pagination-panel'>
                <p className='text-sm text-text-muted'>Page {productPage}</p>
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
          <section className='wf-toolbar-panel'>
            <div className='grid gap-3 md:grid-cols-[2fr,1fr,auto]'>
              <Input
                type='search'
                value={surfaceSearch}
                onChange={event => handleSurfaceSearchChange(event.target.value)}
                placeholder='Search by surface name'
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
              <Button type='button' onClick={openCreateSurfaceTypeModal}>
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
                <p className='text-sm text-text-muted'>Page {surfacePage}</p>
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
