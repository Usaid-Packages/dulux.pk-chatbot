import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { apiEndpoints, GET, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { ProductListResponse } from '#/types/products';
import { normalizeProductsResponse, type PaginatedApiResponse, type ProductApiResponse } from './shared';

const STALE_TIME_FIVE_MINUTES = 5 * 60 * 1000;

export const useGetProductBasecoatsQuery = (productId: string): UseQueryResult<ProductListResponse, Error> => {
  return useQuery<ProductListResponse, Error>({
    queryKey: queryKeys.products.basecoats(productId),
    queryFn: async (): Promise<ProductListResponse> => {
      const response = await performRequest<PaginatedApiResponse<ProductApiResponse>>({
        method: GET,
        url: apiEndpoints.products.basecoats(productId),
      });

      return normalizeProductsResponse(response);
    },
    enabled: productId.length > 0,
    staleTime: STALE_TIME_FIVE_MINUTES,
  });
};
