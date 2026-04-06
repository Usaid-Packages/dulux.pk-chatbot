import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { ProductListResponse, ProductQueryParams } from '#/types/products';
import {
  normalizeProductsResponse,
  serializeProductParams,
  type PaginatedApiResponse,
  type ProductApiResponse,
} from './shared';

const STALE_TIME_FIVE_MINUTES = 5 * 60 * 1000;

const fetchProducts = async (params?: ProductQueryParams): Promise<ProductListResponse> => {
  const response = await performRequest<PaginatedApiResponse<ProductApiResponse>, undefined, ProductQueryParams>({
    method: 'get',
    url: apiEndpoints.products.list,
    params,
  });

  return normalizeProductsResponse(response);
};

export const useGetProductsQuery = (params?: ProductQueryParams): UseQueryResult<ProductListResponse, Error> => {
  const paramsKey = serializeProductParams(params);

  return useQuery<ProductListResponse, Error>({
    queryKey: queryKeys.products.list(paramsKey),
    queryFn: (): Promise<ProductListResponse> => fetchProducts(params),
    staleTime: STALE_TIME_FIVE_MINUTES,
  });
};
