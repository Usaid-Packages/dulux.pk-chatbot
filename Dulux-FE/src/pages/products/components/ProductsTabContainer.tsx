import * as React from 'react';

import { ProductTable } from '#/components/products';
import { PaginationFooter } from '#/components/shared';
import {
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
import { PRODUCT_ORDERING_VALUES, PRODUCTS_LIST_FILTER_ALL, PRODUCT_STATUS_FILTER_VALUES } from '#/constants';
import { PRODUCT_TYPES } from '#/types/products';
import type { Product } from '#/types/products';
import type { ProductOrdering, ProductStatusFilter, ProductTypeFilter } from '#/utils';

interface ProductsTabContainerProps {
  productSearch: string;
  productTypeFilter: ProductTypeFilter;
  productStatusFilter: ProductStatusFilter;
  productOrdering: ProductOrdering;
  productPage: number;
  productTotalPages: number;
  products: Product[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  hasNextPage: boolean;
  onProductSearchChange: (value: string) => void;
  onProductTypeFilterChange: (value: string) => void;
  onProductStatusFilterChange: (value: string) => void;
  onProductOrderingChange: (value: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

/**
 * ProductsTabContainer renders the Products tab filters, table, and pagination controls.
 */
export const ProductsTabContainer = ({
  productSearch,
  productTypeFilter,
  productStatusFilter,
  productOrdering,
  productPage,
  productTotalPages,
  products,
  isLoading,
  isError,
  errorMessage,
  hasNextPage,
  onProductSearchChange,
  onProductTypeFilterChange,
  onProductStatusFilterChange,
  onProductOrderingChange,
  onPreviousPage,
  onNextPage,
}: ProductsTabContainerProps): React.JSX.Element => {
  const handleProductSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    onProductSearchChange(event.target.value);
  };

  const filtersToolbar = (
    <section className='wf-toolbar-panel border-primary/15 bg-white shadow-[0_10px_24px_rgba(19,87,167,0.08)]'>
      <div className='grid items-center gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]'>
        <Input
          type='search'
          value={productSearch}
          onChange={handleProductSearchInputChange}
          placeholder='Search by product name'
          className='h-11 rounded-xl border-primary/25 bg-white'
          aria-label='Search products'
        />
        <Select value={productTypeFilter} onValueChange={onProductTypeFilterChange}>
          <SelectTrigger aria-label='Filter products by type'>
            <SelectValue placeholder='Type: All' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PRODUCTS_LIST_FILTER_ALL}>Type: All</SelectItem>
            <SelectItem value={PRODUCT_TYPES.TOPCOAT}>Topcoat</SelectItem>
            <SelectItem value={PRODUCT_TYPES.BASECOAT}>Basecoat</SelectItem>
          </SelectContent>
        </Select>
        <Select value={productStatusFilter} onValueChange={onProductStatusFilterChange}>
          <SelectTrigger aria-label='Filter products by status'>
            <SelectValue placeholder='Status: All' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PRODUCT_STATUS_FILTER_VALUES.ALL}>Status: All</SelectItem>
            <SelectItem value={PRODUCT_STATUS_FILTER_VALUES.ACTIVE}>Active</SelectItem>
            <SelectItem value={PRODUCT_STATUS_FILTER_VALUES.INACTIVE}>Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={productOrdering} onValueChange={onProductOrderingChange}>
          <SelectTrigger aria-label='Order products'>
            <SelectValue placeholder='Order By' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PRODUCT_ORDERING_VALUES.CREATED_DESC}>Newest first</SelectItem>
            <SelectItem value={PRODUCT_ORDERING_VALUES.CREATED_ASC}>Oldest first</SelectItem>
            <SelectItem value={PRODUCT_ORDERING_VALUES.NAME_ASC}>Name (A-Z)</SelectItem>
            <SelectItem value={PRODUCT_ORDERING_VALUES.NAME_DESC}>Name (Z-A)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </section>
  );

  if (isLoading) {
    return (
      <>
        {filtersToolbar}

        <section className='space-y-2 wf-card wf-card-p4'>
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
        </section>
      </>
    );
  }

  if (isError) {
    return (
      <>
        {filtersToolbar}

        <Empty>
          <EmptyContent>
            <EmptyHeader>
              <EmptyTitle>Failed to load products</EmptyTitle>
              <EmptyDescription>{errorMessage}</EmptyDescription>
            </EmptyHeader>
          </EmptyContent>
        </Empty>
      </>
    );
  }

  return (
    <>
      {filtersToolbar}

      {products.length === 0 ? (
        <Empty>
          <EmptyContent>
            <EmptyHeader>
              <EmptyTitle>No products found</EmptyTitle>
              <EmptyDescription>Try adjusting your filters.</EmptyDescription>
            </EmptyHeader>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <ProductTable products={products} />

          <PaginationFooter
            currentPage={productPage}
            totalPages={productTotalPages}
            disablePrevious={productPage <= 1}
            disableNext={!hasNextPage}
            onPreviousPage={onPreviousPage}
            onNextPage={onNextPage}
          />
        </>
      )}
    </>
  );
};
