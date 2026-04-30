import type { JSX } from 'react';

import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui';
import { PRODUCT_ORDERING_VALUES, PRODUCTS_LIST_FILTER_ALL, PRODUCT_STATUS_FILTER_VALUES } from '#/constants';
import { PRODUCT_TYPES } from '#/types/products';
import type { ProductOrdering, ProductStatusFilter, ProductTypeFilter } from '#/utils';

interface ProductsFiltersToolbarProps {
  productSearch: string;
  productTypeFilter: ProductTypeFilter;
  productStatusFilter: ProductStatusFilter;
  productOrdering: ProductOrdering;
  onProductSearchChange: (value: string) => void;
  onProductTypeFilterChange: (value: string) => void;
  onProductStatusFilterChange: (value: string) => void;
  onProductOrderingChange: (value: string) => void;
}

/**
 * ProductsFiltersToolbar renders the products list filter controls.
 */
export const ProductsFiltersToolbar = ({
  productSearch,
  productTypeFilter,
  productStatusFilter,
  productOrdering,
  onProductSearchChange,
  onProductTypeFilterChange,
  onProductStatusFilterChange,
  onProductOrderingChange,
}: ProductsFiltersToolbarProps): JSX.Element => {
  const handleProductSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    onProductSearchChange(event.target.value);
  };

  return (
    <section className='wf-toolbar-panel border-primary/15 bg-white ui-shadow-panel'>
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
            <SelectItem value={PRODUCT_TYPES.SPECIALIST}>Specialist</SelectItem>
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
};
