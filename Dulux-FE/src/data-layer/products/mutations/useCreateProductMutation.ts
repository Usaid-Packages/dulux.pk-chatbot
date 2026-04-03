/* eslint import/order: off */
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { Product, ProductMutationPayload } from '#/types/products';
import { productMockStore } from '../mockStore';
import { shouldUseMockProducts } from '../transport';
import { normalizeProduct, type ProductApiResponse } from '../queries/shared';

const createProduct = async (payload: ProductMutationPayload): Promise<Product> => {
  if (shouldUseMockProducts()) {
    return productMockStore.createProduct(payload);
  }

  const response = await performRequest<ProductApiResponse, ProductMutationPayload>({
    method: 'post',
    url: apiEndpoints.products.list,
    payload,
  });

  return normalizeProduct(response);
};

export const useCreateProductMutation = (): UseMutationResult<Product, Error, ProductMutationPayload> => {
  const queryClient = useQueryClient();

  return useMutation<Product, Error, ProductMutationPayload>({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
};
