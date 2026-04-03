/* eslint import/order: off */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { Product } from '#/types/products';
import { productMockStore } from '../mockStore';
import { isNetworkError, shouldUseMockProducts } from '../transport';
import { normalizeProduct, type ProductApiResponse } from './shared';

const fetchProductById = async (id: string): Promise<Product> => {
  if (shouldUseMockProducts()) {
    return productMockStore.fetchProductById(id);
  }

  try {
    const response = await performRequest<ProductApiResponse>({
      method: 'get',
      url: apiEndpoints.products.detail(id),
    });

    return normalizeProduct(response);
  } catch (error) {
    if (isNetworkError(error)) {
      return productMockStore.fetchProductById(id);
    }
    throw error;
  }
};

export const useGetProductByIdQuery = (id: string): UseQueryResult<Product, Error> => {
  return useQuery<Product, Error>({
    queryKey: queryKeys.products.detail(id),
    queryFn: (): Promise<Product> => fetchProductById(id),
    enabled: id.length > 0,
  });
};
