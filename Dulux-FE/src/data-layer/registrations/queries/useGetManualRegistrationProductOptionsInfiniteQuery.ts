import { useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';

import { apiEndpoints, GET, queryKeys, REGISTRATION_PRODUCT_TYPES } from '#/constants';
import { performRequest } from '#/services';
import type { ManualRegistrationProductOption } from '#/types/manualRegistration';
import type { ProductType } from '#/types/products';

interface ManualRegistrationProductApiItem {
  id?: number;
  name?: string;
  productType?: ProductType;
  product_type?: ProductType;
  warrantyYears?: number;
  warranty_years?: number;
  isActive?: boolean;
  is_active?: boolean;
}

interface ManualRegistrationProductsApiResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: ManualRegistrationProductApiItem[];
}

interface ManualRegistrationWarrantyOptionsParams extends Record<string, unknown> {
  product_type: ProductType;
  topcoat_id?: number;
  page?: number;
}

interface ManualRegistrationProductOptionsInfiniteResult {
  options: ManualRegistrationProductOption[];
  hasNextPage: boolean;
  isLoading: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  error: Error | null;
  fetchNextPage: () => Promise<unknown>;
}

const INITIAL_PAGE_PARAM = 1;

const getWarrantyYears = (product: ManualRegistrationProductApiItem): number | undefined => {
  return product.warrantyYears ?? product.warranty_years;
};

const toManualProductOptions = (products: ManualRegistrationProductApiItem[]): ManualRegistrationProductOption[] => {
  return products
    .filter(
      product =>
        typeof product.id === 'number' &&
        typeof product.name === 'string' &&
        product.name.trim() !== '' &&
        typeof getWarrantyYears(product) === 'number' &&
        (getWarrantyYears(product) ?? 0) > 0
    )
    .map(product => ({
      id: String(product.id),
      label: product.name ?? '',
      warrantyYears: getWarrantyYears(product),
    }));
};

const parseNextPageParam = (nextUrl: string | null | undefined): number | undefined => {
  if (!nextUrl) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(nextUrl);
    const pageParam = parsedUrl.searchParams.get('page');
    const pageNumber = Number.parseInt(pageParam ?? '', 10);
    if (!Number.isFinite(pageNumber) || pageNumber <= 0) {
      return undefined;
    }

    return pageNumber;
  } catch {
    return undefined;
  }
};

const getFlattenedOptions = (
  data: InfiniteData<ManualRegistrationProductsApiResponse, number> | undefined
): ManualRegistrationProductOption[] => {
  const deduped = new Map<string, ManualRegistrationProductOption>();

  data?.pages.forEach(page => {
    const normalizedProducts = toManualProductOptions(page.results ?? []);
    normalizedProducts.forEach(product => {
      deduped.set(product.id, product);
    });
  });

  return Array.from(deduped.values());
};

const normalizeProductType = (productType: ProductType): ProductType => {
  if (productType === REGISTRATION_PRODUCT_TYPES.TOPCOAT) {
    return REGISTRATION_PRODUCT_TYPES.TOPCOAT;
  }

  return REGISTRATION_PRODUCT_TYPES.BASECOAT;
};

/**
 * Fetches manual registration product options with paginated infinite-query support.
 *
 * @param productType - Product type to fetch.
 * @param topcoatId - Optional topcoat ID when fetching linked basecoats.
 * @returns Infinite-query state plus flattened product options list.
 */
export const useGetManualRegistrationProductOptionsInfiniteQuery = (
  productType: ProductType,
  topcoatId?: string
): ManualRegistrationProductOptionsInfiniteResult => {
  const parsedTopcoatId = Number.parseInt(topcoatId ?? '', 10);
  const hasValidTopcoatId = Number.isFinite(parsedTopcoatId) && parsedTopcoatId > 0;
  const shouldEnableQuery = productType === REGISTRATION_PRODUCT_TYPES.TOPCOAT ? true : hasValidTopcoatId;

  const query = useInfiniteQuery<
    ManualRegistrationProductsApiResponse,
    Error,
    InfiniteData<ManualRegistrationProductsApiResponse, number>,
    readonly ['registrations', 'manual-products', 'warranty-options', ProductType, string],
    number
  >({
    queryKey: queryKeys.registrations.manualWarrantyOptions(
      normalizeProductType(productType),
      hasValidTopcoatId ? String(parsedTopcoatId) : undefined
    ),
    initialPageParam: INITIAL_PAGE_PARAM,
    enabled: shouldEnableQuery,
    queryFn: async ({ pageParam }): Promise<ManualRegistrationProductsApiResponse> => {
      const params: ManualRegistrationWarrantyOptionsParams = {
        product_type: productType,
        page: pageParam,
      };

      if (productType === REGISTRATION_PRODUCT_TYPES.BASECOAT && hasValidTopcoatId) {
        params.topcoat_id = parsedTopcoatId;
      }

      return performRequest<ManualRegistrationProductsApiResponse, undefined, ManualRegistrationWarrantyOptionsParams>({
        method: GET,
        url: apiEndpoints.products.warrantyOptions,
        params,
      });
    },
    getNextPageParam: lastPage => {
      return parseNextPageParam(lastPage.next);
    },
  });

  return {
    options: getFlattenedOptions(query.data),
    hasNextPage: Boolean(query.hasNextPage),
    isLoading: query.isLoading,
    isError: query.isError,
    isFetchingNextPage: query.isFetchingNextPage,
    error: query.error ?? null,
    fetchNextPage: query.fetchNextPage,
  };
};
