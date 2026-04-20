import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';

import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  FIRST_PAGE,
  INVALID_PAGE_ERROR_MESSAGE,
  PRODUCT_ORDERING_VALUES,
  PRODUCTS_LIST_FILTER_ALL,
  PRODUCTS_LIST_TABS,
  PRODUCT_PAGE_SIZE,
  PRODUCT_STATUS_FILTER_VALUES,
  SURFACE_ENVIRONMENT_FILTER_VALUES,
  SURFACE_TYPE_PAGE_SIZE,
} from '#/constants';
import {
  useCreateSurfaceTypeMutation,
  useDeleteSurfaceTypeMutation,
  useGetProductsQuery,
  useGetSurfaceTypesQuery,
  useUpdateSurfaceTypeMutation,
} from '#/data-layer/products';
import { useDebouncedValue } from '#/hooks';
import type { SurfaceType, SurfaceTypeFormValues, SurfaceTypeQueryParams } from '#/types/products';
import {
  buildProductsListSearchParams,
  buildSurfaceLinkedCountMap,
  getApiErrorMessage,
  isProductOrdering,
  isProductStatusFilter,
  isProductTab,
  isProductTypeFilter,
  isSurfaceEnvironmentFilter,
  parsePageFromSearchParam,
  type ProductOrdering,
  type ProductStatusFilter,
  type ProductTab,
  type ProductTypeFilter,
  type SurfaceEnvironmentFilter,
} from '#/utils';
import { mapSurfaceTypeFormToPayload } from './productHelpers';

export const useProductsListPageController = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTabParam = searchParams.get('tab'),
    activeTab: ProductTab = isProductTab(activeTabParam) ? activeTabParam : PRODUCTS_LIST_TABS.PRODUCTS;

  const [productSearch, setProductSearch] = useState<string>(() => searchParams.get('productSearch') ?? '');
  const [productTypeFilter, setProductTypeFilter] = useState<ProductTypeFilter>(() => {
    const value = searchParams.get('productType');
    return isProductTypeFilter(value) ? value : PRODUCTS_LIST_FILTER_ALL;
  });
  const [productStatusFilter, setProductStatusFilter] = useState<ProductStatusFilter>(() => {
    const value = searchParams.get('productStatus');
    return isProductStatusFilter(value) ? value : PRODUCT_STATUS_FILTER_VALUES.ALL;
  });
  const [productOrdering, setProductOrdering] = useState<ProductOrdering>(() => {
    const value = searchParams.get('productOrdering');
    return isProductOrdering(value) ? value : PRODUCT_ORDERING_VALUES.CREATED_DESC;
  });
  const [productPage, setProductPage] = useState(() => parsePageFromSearchParam(searchParams.get('productPage')));

  const [surfaceSearch, setSurfaceSearch] = React.useState<string>(() => searchParams.get('surfaceSearch') ?? '');
  const [surfaceEnvironmentFilter, setSurfaceEnvironmentFilter] = useState<SurfaceEnvironmentFilter>(() => {
    const value = searchParams.get('surfaceEnvironment');
    return isSurfaceEnvironmentFilter(value) ? value : SURFACE_ENVIRONMENT_FILTER_VALUES.ALL;
  });
  const [surfacePage, setSurfacePage] = useState(() => parsePageFromSearchParam(searchParams.get('surfacePage')));

  const debouncedProductSearch = useDebouncedValue(productSearch),
    debouncedSurfaceSearch = useDebouncedValue(surfaceSearch);

  const [isSurfaceTypeModalOpen, setSurfaceTypeModalOpen] = useState<boolean>(false);
  const [surfaceTypeEditTarget, setSurfaceTypeEditTarget] = useState<SurfaceType | null>(null);
  const [surfaceTypeDeleteTarget, setSurfaceTypeDeleteTarget] = useState<SurfaceType | null>(null);

  const productQuery = useGetProductsQuery({
    search: debouncedProductSearch.trim() || undefined,
    product_type: productTypeFilter === PRODUCTS_LIST_FILTER_ALL ? undefined : productTypeFilter,
    is_active:
      productStatusFilter === PRODUCT_STATUS_FILTER_VALUES.ALL
        ? undefined
        : productStatusFilter === PRODUCT_STATUS_FILTER_VALUES.ACTIVE,
    ordering: productOrdering,
    page_size: PRODUCT_PAGE_SIZE,
    page: productPage,
  });

  const surfaceTypeParams: SurfaceTypeQueryParams = {
    search: debouncedSurfaceSearch.trim() || undefined,
    environment:
      surfaceEnvironmentFilter === SURFACE_ENVIRONMENT_FILTER_VALUES.ALL ? undefined : surfaceEnvironmentFilter,
    page: surfacePage,
    page_size: SURFACE_TYPE_PAGE_SIZE,
  };
  const surfaceTypesQuery = useGetSurfaceTypesQuery(surfaceTypeParams);

  const createSurfaceTypeMutation = useCreateSurfaceTypeMutation();
  const deleteSurfaceTypeMutation = useDeleteSurfaceTypeMutation();
  const updateSurfaceTypeMutation = useUpdateSurfaceTypeMutation();

  const products = productQuery.data?.results ?? [];
  const surfaceTypes = surfaceTypesQuery.data?.results ?? [];

  const productTotalPages = Math.max(1, Math.ceil((productQuery.data?.count ?? 0) / PRODUCT_PAGE_SIZE));
  const surfaceTypeTotalPages = Math.max(1, Math.ceil((surfaceTypesQuery.data?.count ?? 0) / SURFACE_TYPE_PAGE_SIZE));

  const isSurfaceTypesInvalidPageError =
    surfaceTypesQuery.isError && getApiErrorMessage(surfaceTypesQuery.error).includes(INVALID_PAGE_ERROR_MESSAGE);

  const linkedProductCountMap = useMemo<Record<number, number>>(() => {
    return buildSurfaceLinkedCountMap(products);
  }, [products]);

  const searchParamsString = searchParams.toString();

  useEffect(() => {
    const nextParams = buildProductsListSearchParams({
      activeTab,
      debouncedProductSearch,
      productTypeFilter,
      productStatusFilter,
      productOrdering,
      productPage,
      debouncedSurfaceSearch,
      surfaceEnvironmentFilter,
      surfacePage,
    });

    if (nextParams.toString() !== searchParamsString) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    activeTab,
    debouncedProductSearch,
    productTypeFilter,
    productStatusFilter,
    productOrdering,
    productPage,
    debouncedSurfaceSearch,
    surfaceEnvironmentFilter,
    surfacePage,
    searchParamsString,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!productQuery.isLoading && !productQuery.isError && productPage > productTotalPages) {
      setProductPage(productTotalPages);
    }
  }, [productPage, productQuery.isLoading, productQuery.isError, productTotalPages]);

  useEffect(() => {
    if (!surfaceTypesQuery.isLoading && !surfaceTypesQuery.isError && surfacePage > surfaceTypeTotalPages) {
      setSurfacePage(surfaceTypeTotalPages);
    }
  }, [surfacePage, surfaceTypesQuery.isLoading, surfaceTypesQuery.isError, surfaceTypeTotalPages]);

  useEffect(() => {
    if (surfacePage > FIRST_PAGE && isSurfaceTypesInvalidPageError) {
      setSurfacePage(previousPage => Math.max(FIRST_PAGE, previousPage - 1));
    }
  }, [isSurfaceTypesInvalidPageError, surfacePage]);

  const setTab = (tab: ProductTab): void => {
    setSearchParams(previous => {
      const nextParams = new URLSearchParams(previous);
      nextParams.set('tab', tab);
      return nextParams;
    });
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
            setSurfaceTypeModalOpen(false);
            setSurfaceTypeEditTarget(null);
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
        setSurfaceTypeModalOpen(false);
        setSurfaceTypeEditTarget(null);
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  const handleDeleteSurfaceType = (): void => {
    if (!surfaceTypeDeleteTarget) return;

    deleteSurfaceTypeMutation.mutate(String(surfaceTypeDeleteTarget.id), {
      onSuccess: () => {
        if (surfacePage > FIRST_PAGE && surfaceTypes.length === 1) {
          setSurfacePage(previousPage => Math.max(FIRST_PAGE, previousPage - 1));
        }
        toast.success('Surface type deleted successfully.');
        setSurfaceTypeDeleteTarget(null);
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  return {
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
    isProductLoading: productQuery.isLoading,
    isProductError: productQuery.isError,
    productErrorMessage: productQuery.error?.message ?? 'Unable to fetch products.',
    hasProductNextPage: Boolean(productQuery.data?.next),
    isSurfaceTypesLoading: surfaceTypesQuery.isLoading,
    isSurfaceTypesError: surfaceTypesQuery.isError,
    surfaceTypesErrorMessage: surfaceTypesQuery.error?.message ?? 'Unable to fetch surface types.',
    hasSurfaceTypesNextPage: Boolean(surfaceTypesQuery.data?.next),
    isSurfaceTypeSubmitting: createSurfaceTypeMutation.isPending || updateSurfaceTypeMutation.isPending,
    isSurfaceTypeDeletePending: deleteSurfaceTypeMutation.isPending,
    setProductsTab: () => setTab(PRODUCTS_LIST_TABS.PRODUCTS),
    setSurfaceTypesTab: () => setTab(PRODUCTS_LIST_TABS.SURFACE_TYPES),
    handleProductSearchChange: (value: string): void => {
      setProductSearch(value);
      setProductPage(FIRST_PAGE);
    },
    handleProductTypeFilterChange: (value: string): void => {
      setProductTypeFilter(
        value === PRODUCTS_LIST_FILTER_ALL ? PRODUCTS_LIST_FILTER_ALL : (value as ProductTypeFilter)
      );
      setProductPage(FIRST_PAGE);
    },
    handleProductStatusFilterChange: (value: string): void => {
      setProductStatusFilter(value as ProductStatusFilter);
      setProductPage(FIRST_PAGE);
    },
    handleProductOrderingChange: (value: string): void => {
      setProductOrdering(value as ProductOrdering);
      setProductPage(FIRST_PAGE);
    },
    goToProductPreviousPage: () => {
      if (productPage > FIRST_PAGE) setProductPage(previousPage => previousPage - 1);
    },
    goToProductNextPage: () => {
      if (productQuery.data?.next) setProductPage(previousPage => previousPage + 1);
    },
    handleSurfaceSearchChange: (value: string): void => {
      setSurfaceSearch(value);
      setSurfacePage(FIRST_PAGE);
    },
    handleSurfaceEnvironmentFilterChange: (value: string): void => {
      setSurfaceEnvironmentFilter(value as SurfaceEnvironmentFilter);
      setSurfacePage(FIRST_PAGE);
    },
    goToSurfacePreviousPage: () => {
      if (surfacePage > FIRST_PAGE) setSurfacePage(previousPage => previousPage - 1);
    },
    goToSurfaceNextPage: () => {
      if (surfaceTypesQuery.data?.next) setSurfacePage(previousPage => previousPage + 1);
    },
    openCreateSurfaceTypeModal: () => {
      setSurfaceTypeEditTarget(null);
      setSurfaceTypeModalOpen(true);
    },
    openEditSurfaceTypeModal: (surfaceType: SurfaceType) => {
      setSurfaceTypeEditTarget(surfaceType);
      setSurfaceTypeModalOpen(true);
    },
    closeSurfaceTypeModal: () => {
      setSurfaceTypeModalOpen(false);
      setSurfaceTypeEditTarget(null);
    },
    openDeleteSurfaceTypeModal: (surfaceType: SurfaceType) => {
      setSurfaceTypeDeleteTarget(surfaceType);
    },
    closeDeleteSurfaceTypeModal: () => {
      setSurfaceTypeDeleteTarget(null);
    },
    submitSurfaceType,
    handleDeleteSurfaceType,
  };
};
