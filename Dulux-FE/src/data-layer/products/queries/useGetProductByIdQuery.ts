import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { Product } from '#/types/products';
import { normalizeProduct, type ProductApiResponse } from './shared';

const fetchProductById = async (id: string): Promise<Product> => {
  const response = await performRequest<ProductApiResponse>({
    method: 'get',
    url: apiEndpoints.products.detail(id),
  });

  return normalizeProduct(response);
};

export const useGetProductByIdQuery = (id: string): UseQueryResult<Product, Error> => {
  return useQuery<Product, Error>({
    queryKey: queryKeys.products.detail(id),
    queryFn: (): Promise<Product> => fetchProductById(id),
    enabled: id.length > 0,
  });
};
