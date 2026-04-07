/* eslint import/order: off */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { apiEndpoints, GET, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { ProductImageListResponse } from '#/types/products';
import { normalizeProductImagesResponse, type PaginatedApiResponse, type ProductImageApiResponse } from './shared';

const STALE_TIME_FIVE_MINUTES = 5 * 60 * 1000;

const fetchProductImages = async (productId: string): Promise<ProductImageListResponse> => {
  const response = await performRequest<PaginatedApiResponse<ProductImageApiResponse>>({
    method: GET,
    url: apiEndpoints.products.images(productId),
  });

  return normalizeProductImagesResponse(response);
};

export const useGetProductImagesQuery = (productId: string): UseQueryResult<ProductImageListResponse, Error> => {
  return useQuery<ProductImageListResponse, Error>({
    queryKey: queryKeys.products.images(productId),
    queryFn: (): Promise<ProductImageListResponse> => fetchProductImages(productId),
    enabled: productId.length > 0,
    staleTime: STALE_TIME_FIVE_MINUTES,
  });
};
