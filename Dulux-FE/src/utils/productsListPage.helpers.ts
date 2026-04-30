import {
  FIRST_PAGE,
  PRODUCT_ORDERING_VALUES,
  PRODUCTS_LIST_FILTER_ALL,
  PRODUCTS_LIST_TABS,
  PRODUCT_STATUS_FILTER_VALUES,
  SURFACE_ENVIRONMENT_FILTER_VALUES,
} from '#/constants';
import { PRODUCT_TYPES, type Product, type ProductEnvironment, type ProductType } from '#/types/products';

export type ProductTab = (typeof PRODUCTS_LIST_TABS)[keyof typeof PRODUCTS_LIST_TABS];
export type ProductTypeFilter = ProductType | typeof PRODUCTS_LIST_FILTER_ALL;
export type ProductStatusFilter = (typeof PRODUCT_STATUS_FILTER_VALUES)[keyof typeof PRODUCT_STATUS_FILTER_VALUES];
export type ProductOrdering = (typeof PRODUCT_ORDERING_VALUES)[keyof typeof PRODUCT_ORDERING_VALUES];
export type SurfaceEnvironmentFilter = ProductEnvironment | typeof SURFACE_ENVIRONMENT_FILTER_VALUES.ALL;

interface BuildProductsListSearchParamsInput {
  activeTab: ProductTab;
  debouncedProductSearch: string;
  productTypeFilter: ProductTypeFilter;
  productStatusFilter: ProductStatusFilter;
  productOrdering: ProductOrdering;
  productPage: number;
  debouncedSurfaceSearch: string;
  surfaceEnvironmentFilter: SurfaceEnvironmentFilter;
  surfacePage: number;
}

export const isProductTab = (value: string | null): value is ProductTab => {
  return value === PRODUCTS_LIST_TABS.PRODUCTS || value === PRODUCTS_LIST_TABS.SURFACE_TYPES;
};

export const isProductTypeFilter = (value: string | null): value is ProductTypeFilter => {
  return (
    value === PRODUCTS_LIST_FILTER_ALL ||
    value === PRODUCT_TYPES.TOPCOAT ||
    value === PRODUCT_TYPES.BASECOAT ||
    value === PRODUCT_TYPES.SPECIALIST
  );
};

export const isProductStatusFilter = (value: string | null): value is ProductStatusFilter => {
  return (
    value === PRODUCT_STATUS_FILTER_VALUES.ALL ||
    value === PRODUCT_STATUS_FILTER_VALUES.ACTIVE ||
    value === PRODUCT_STATUS_FILTER_VALUES.INACTIVE
  );
};

export const isProductOrdering = (value: string | null): value is ProductOrdering => {
  return (
    value === PRODUCT_ORDERING_VALUES.NAME_ASC ||
    value === PRODUCT_ORDERING_VALUES.NAME_DESC ||
    value === PRODUCT_ORDERING_VALUES.CREATED_ASC ||
    value === PRODUCT_ORDERING_VALUES.CREATED_DESC
  );
};

export const isSurfaceEnvironmentFilter = (value: string | null): value is SurfaceEnvironmentFilter => {
  return (
    value === SURFACE_ENVIRONMENT_FILTER_VALUES.ALL ||
    value === SURFACE_ENVIRONMENT_FILTER_VALUES.INTERIOR ||
    value === SURFACE_ENVIRONMENT_FILTER_VALUES.EXTERIOR
  );
};

export const parsePageFromSearchParam = (value: string | null): number => {
  const parsedPage = Number.parseInt(value ?? String(FIRST_PAGE), 10);
  return Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : FIRST_PAGE;
};

export const buildSurfaceLinkedCountMap = (products: Product[]): Record<number, number> => {
  return products.reduce<Record<number, number>>((accumulator, product) => {
    product.surfaceTypes.forEach(surfaceType => {
      const currentCount = accumulator[surfaceType.id] ?? 0;
      accumulator[surfaceType.id] = currentCount + 1;
    });

    return accumulator;
  }, {});
};

export const buildProductsListSearchParams = ({
  activeTab,
  debouncedProductSearch,
  productTypeFilter,
  productStatusFilter,
  productOrdering,
  productPage,
  debouncedSurfaceSearch,
  surfaceEnvironmentFilter,
  surfacePage,
}: BuildProductsListSearchParamsInput): URLSearchParams => {
  const nextParams = new URLSearchParams();
  nextParams.set('tab', activeTab);

  if (debouncedProductSearch.trim().length > 0) nextParams.set('productSearch', debouncedProductSearch.trim());
  if (productTypeFilter !== PRODUCTS_LIST_FILTER_ALL) nextParams.set('productType', productTypeFilter);
  if (productStatusFilter !== PRODUCT_STATUS_FILTER_VALUES.ALL) nextParams.set('productStatus', productStatusFilter);
  if (productOrdering !== PRODUCT_ORDERING_VALUES.CREATED_DESC) nextParams.set('productOrdering', productOrdering);
  if (productPage !== FIRST_PAGE) nextParams.set('productPage', String(productPage));
  if (debouncedSurfaceSearch.trim().length > 0) nextParams.set('surfaceSearch', debouncedSurfaceSearch.trim());
  if (surfaceEnvironmentFilter !== SURFACE_ENVIRONMENT_FILTER_VALUES.ALL)
    nextParams.set('surfaceEnvironment', surfaceEnvironmentFilter);
  if (surfacePage !== FIRST_PAGE) nextParams.set('surfacePage', String(surfacePage));

  return nextParams;
};
