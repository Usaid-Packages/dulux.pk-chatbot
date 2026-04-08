import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys, REGISTRATION_PRODUCT_TYPES } from '#/constants';
import { performRequest } from '#/services';
import type { ManualRegistrationProductOption } from '#/types/manualRegistration';
import type { ProductType } from '#/types/products';

interface ManualRegistrationProductApiItem {
  id?: number;
  name?: string;
  basecoats?: ManualRegistrationProductApiItem[];
}

interface ManualRegistrationProductsApiResponse {
  results?: ManualRegistrationProductApiItem[];
}

interface ManualRegistrationProductsParams extends Record<string, unknown> {
  productType: ProductType;
  isActive: boolean;
  ordering: string;
}

export interface ManualRegistrationProductsResult {
  topcoatProducts: ManualRegistrationProductOption[];
  basecoatProducts: ManualRegistrationProductOption[];
}

const MANUAL_PRODUCTS_STALE_TIME_MS = 0;

const toManualProductOptions = (
  response: ManualRegistrationProductsApiResponse | undefined
): ManualRegistrationProductOption[] => {
  return (response?.results ?? [])
    .filter(product => typeof product.id === 'number' && typeof product.name === 'string' && product.name.trim() !== '')
    .map(product => ({
      id: String(product.id),
      label: product.name ?? '',
      linkedBasecoats: (product.basecoats ?? [])
        .filter(
          basecoat =>
            typeof basecoat.id === 'number' && typeof basecoat.name === 'string' && basecoat.name.trim() !== ''
        )
        .map(basecoat => ({
          id: String(basecoat.id),
          label: basecoat.name ?? '',
        })),
    }));
};

const getProductParams = (productType: ProductType): ManualRegistrationProductsParams => {
  return {
    productType,
    isActive: true,
    ordering: 'name',
  };
};

/**
 * Fetches active topcoat/basecoat options for manual registration wizard step 3.
 *
 * @returns React Query result containing product options grouped by type.
 */
export const useGetManualRegistrationProductsQuery = (): UseQueryResult<ManualRegistrationProductsResult, Error> => {
  return useQuery<ManualRegistrationProductsResult, Error>({
    queryKey: queryKeys.registrations.manualProducts,
    queryFn: async (): Promise<ManualRegistrationProductsResult> => {
      const [topcoatResponse, basecoatResponse] = await Promise.all([
        performRequest<ManualRegistrationProductsApiResponse, undefined, ManualRegistrationProductsParams>({
          method: 'get',
          url: apiEndpoints.products.list,
          params: getProductParams(REGISTRATION_PRODUCT_TYPES.TOPCOAT),
        }),
        performRequest<ManualRegistrationProductsApiResponse, undefined, ManualRegistrationProductsParams>({
          method: 'get',
          url: apiEndpoints.products.list,
          params: getProductParams(REGISTRATION_PRODUCT_TYPES.BASECOAT),
        }),
      ]);

      return {
        topcoatProducts: toManualProductOptions(topcoatResponse),
        basecoatProducts: toManualProductOptions(basecoatResponse),
      };
    },
    staleTime: MANUAL_PRODUCTS_STALE_TIME_MS,
  });
};
