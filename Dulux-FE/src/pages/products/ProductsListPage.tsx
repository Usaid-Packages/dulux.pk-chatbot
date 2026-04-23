import type { JSX } from 'react';

import { DeleteConfirmModal, SurfaceTypeModal } from '#/components/products';
import { PRODUCTS_LIST_TABS, PRODUCT_STATUS_FILTER_VALUES } from '#/constants';
import { useProductsListPageController } from '#/hooks/products';
import { cn } from '#/utils';
import { ProductsTabContainer, SurfaceTypesTabContainer } from './components';

/**
 * ProductsListPage renders product catalog and surface-type management tabs.
 */
export const ProductsListPage = (): JSX.Element => {
  const {
    activeTab,
    productSearch,
    productTypeFilter,
    productStatusFilter,
    productOrdering,
    productPage,
    productTotalPages,
    products,
    surfaceSearch,
    surfaceEnvironmentFilter,
    surfacePage,
    surfaceTypeTotalPages,
    surfaceTypes,
    linkedProductCountMap,
    isSurfaceTypeModalOpen,
    surfaceTypeEditTarget,
    surfaceTypeDeleteTarget,
    isProductLoading,
    isProductError,
    productErrorMessage,
    hasProductNextPage,
    isSurfaceTypesLoading,
    isSurfaceTypesError,
    surfaceTypesErrorMessage,
    hasSurfaceTypesNextPage,
    isSurfaceTypeSubmitting,
    isSurfaceTypeDeletePending,
    setProductsTab,
    setSurfaceTypesTab,
    handleProductSearchChange,
    handleProductTypeFilterChange,
    handleProductStatusFilterChange,
    handleProductOrderingChange,
    goToProductPreviousPage,
    goToProductNextPage,
    handleSurfaceSearchChange,
    handleSurfaceEnvironmentFilterChange,
    goToSurfacePreviousPage,
    goToSurfaceNextPage,
    openCreateSurfaceTypeModal,
    openEditSurfaceTypeModal,
    closeSurfaceTypeModal,
    openDeleteSurfaceTypeModal,
    closeDeleteSurfaceTypeModal,
    submitSurfaceType,
    handleDeleteSurfaceType,
  } = useProductsListPageController();

  return (
    <section className='wf-list-shell gap-4'>
      <section className='wf-tabs-panel border-primary/15 bg-white ui-shadow-panel'>
        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            className={cn('wf-filter-tab', activeTab === PRODUCTS_LIST_TABS.PRODUCTS ? 'wf-filter-tab-active' : '')}
            onClick={setProductsTab}
          >
            Products
          </button>
          <button
            type='button'
            className={cn(
              'wf-filter-tab',
              activeTab === PRODUCTS_LIST_TABS.SURFACE_TYPES ? 'wf-filter-tab-active' : ''
            )}
            onClick={setSurfaceTypesTab}
          >
            Surface Types
          </button>
        </div>
      </section>

      {activeTab === PRODUCTS_LIST_TABS.PRODUCTS ? (
        <ProductsTabContainer
          productSearch={productSearch}
          productTypeFilter={productTypeFilter}
          productStatusFilter={productStatusFilter}
          productOrdering={productOrdering}
          productPage={productPage}
          productTotalPages={productTotalPages}
          products={products}
          isLoading={isProductLoading}
          isError={isProductError}
          errorMessage={productErrorMessage}
          hasNextPage={hasProductNextPage}
          onProductSearchChange={handleProductSearchChange}
          onProductTypeFilterChange={handleProductTypeFilterChange}
          onProductStatusFilterChange={handleProductStatusFilterChange}
          onProductOrderingChange={handleProductOrderingChange}
          onPreviousPage={goToProductPreviousPage}
          onNextPage={goToProductNextPage}
        />
      ) : (
        <SurfaceTypesTabContainer
          surfaceSearch={surfaceSearch}
          surfaceEnvironmentFilter={surfaceEnvironmentFilter}
          surfacePage={surfacePage}
          surfaceTypeTotalPages={surfaceTypeTotalPages}
          surfaceTypes={surfaceTypes}
          linkedProductCountMap={linkedProductCountMap}
          isLoading={isSurfaceTypesLoading}
          isError={isSurfaceTypesError}
          errorMessage={surfaceTypesErrorMessage}
          hasNextPage={hasSurfaceTypesNextPage}
          onSurfaceSearchChange={handleSurfaceSearchChange}
          onSurfaceEnvironmentFilterChange={handleSurfaceEnvironmentFilterChange}
          onOpenCreateSurfaceTypeModal={openCreateSurfaceTypeModal}
          onOpenEditSurfaceTypeModal={openEditSurfaceTypeModal}
          onOpenDeleteSurfaceTypeModal={openDeleteSurfaceTypeModal}
          onPreviousPage={goToSurfacePreviousPage}
          onNextPage={goToSurfaceNextPage}
        />
      )}

      <SurfaceTypeModal
        isOpen={isSurfaceTypeModalOpen}
        isSubmitting={isSurfaceTypeSubmitting}
        title={surfaceTypeEditTarget ? 'Edit Surface Type' : 'Add Surface Type'}
        description='Provide a name and category for this surface type.'
        initialValues={
          surfaceTypeEditTarget
            ? {
                name: surfaceTypeEditTarget.name,
                environment: surfaceTypeEditTarget.environment,
                description: '',
                status: PRODUCT_STATUS_FILTER_VALUES.ACTIVE,
              }
            : undefined
        }
        submitLabel={surfaceTypeEditTarget ? 'Save Changes' : 'Add Surface Type'}
        onClose={closeSurfaceTypeModal}
        onSubmit={submitSurfaceType}
      />

      <DeleteConfirmModal
        isOpen={Boolean(surfaceTypeDeleteTarget)}
        isSubmitting={isSurfaceTypeDeletePending}
        title='Delete Surface Type'
        description={
          surfaceTypeDeleteTarget
            ? `Are you sure you want to delete "${surfaceTypeDeleteTarget.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this surface type?'
        }
        confirmLabel='Delete Surface Type'
        onClose={closeDeleteSurfaceTypeModal}
        onConfirm={handleDeleteSurfaceType}
      />
    </section>
  );
};
