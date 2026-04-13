import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

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
  page_size?: number;
}

export interface ManualRegistrationProductsResult {
  topcoatProducts: ManualRegistrationProductOption[];
  basecoatProducts: ManualRegistrationProductOption[];
}

const MANUAL_PRODUCTS_STALE_TIME_MS = 0;
const MAX_WARRANTY_OPTIONS_PAGES = 50;

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

const mergeUniqueBasecoatOptions = (
  existingOptions: ManualRegistrationProductOption[],
  nextOptions: ManualRegistrationProductOption[]
): ManualRegistrationProductOption[] => {
  const merged = new Map<string, ManualRegistrationProductOption>();

  existingOptions.forEach(option => {
    merged.set(option.id, option);
  });

  nextOptions.forEach(option => {
    merged.set(option.id, option);
  });

  return Array.from(merged.values());
};

const fetchWarrantyOptions = async (
  params: ManualRegistrationWarrantyOptionsParams
): Promise<ManualRegistrationProductsApiResponse> => {
  return performRequest<ManualRegistrationProductsApiResponse, undefined, ManualRegistrationWarrantyOptionsParams>({
    method: GET,
    url: apiEndpoints.products.warrantyOptions,
    params,
  });
};

const fetchAllWarrantyOptions = async (
  params: Omit<ManualRegistrationWarrantyOptionsParams, 'page'>
): Promise<ManualRegistrationProductApiItem[]> => {
  const products: ManualRegistrationProductApiItem[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages && currentPage <= MAX_WARRANTY_OPTIONS_PAGES) {
    const response = await fetchWarrantyOptions({
      ...params,
      page: currentPage,
    });

    products.push(...(response.results ?? []));

    hasMorePages = Boolean(response.next);
    currentPage += 1;
  }

  return products;
};

/**
 * Fetches eligible topcoat/basecoat options for manual registration wizard step 3.
 *
 * @returns React Query result containing product options grouped by type.
 */
export const useGetManualRegistrationProductsQuery = (): UseQueryResult<ManualRegistrationProductsResult, Error> => {
  return useQuery<ManualRegistrationProductsResult, Error>({
    queryKey: queryKeys.registrations.manualProducts,
    queryFn: async (): Promise<ManualRegistrationProductsResult> => {
      const topcoatApiItems = await fetchAllWarrantyOptions({
        product_type: REGISTRATION_PRODUCT_TYPES.TOPCOAT,
      });

      const topcoatProducts = toManualProductOptions(topcoatApiItems);

      const topcoatProductsWithBasecoats = await Promise.all(
        topcoatProducts.map(async topcoat => {
          const parsedTopcoatId = Number.parseInt(topcoat.id, 10);
          if (!Number.isFinite(parsedTopcoatId) || parsedTopcoatId <= 0) {
            return {
              ...topcoat,
              linkedBasecoats: [],
            };
          }

          const basecoatApiItems = await fetchAllWarrantyOptions({
            product_type: REGISTRATION_PRODUCT_TYPES.BASECOAT,
            topcoat_id: parsedTopcoatId,
          });

          return {
            ...topcoat,
            linkedBasecoats: toManualProductOptions(basecoatApiItems),
          };
        })
      );

      const basecoatProducts = topcoatProductsWithBasecoats.reduce<ManualRegistrationProductOption[]>(
        (accumulator, topcoat) => {
          return mergeUniqueBasecoatOptions(accumulator, topcoat.linkedBasecoats ?? []);
        },
        []
      );

      return {
        topcoatProducts: topcoatProductsWithBasecoats,
        basecoatProducts,
      };
    },
    staleTime: MANUAL_PRODUCTS_STALE_TIME_MS,
  });
};
