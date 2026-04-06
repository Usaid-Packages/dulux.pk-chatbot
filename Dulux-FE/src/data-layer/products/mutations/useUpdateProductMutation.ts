import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { Product, ProductMutationPayload } from '#/types/products';
import { productMockStore } from '../mockStore';
import { normalizeProduct, type ProductApiResponse } from '../queries/shared';
import { shouldUseMockProducts } from '../transport';

interface UpdateProductVariables {
  id: string;
  payload: ProductMutationPayload;
}

const updateProduct = async ({ id, payload }: UpdateProductVariables): Promise<Product> => {
  if (shouldUseMockProducts()) {
    return productMockStore.updateProduct(id, payload);
  }

  const response = await performRequest<ProductApiResponse, ProductMutationPayload>({
    method: 'patch',
    url: apiEndpoints.products.detail(id),
    payload,
  });

  return normalizeProduct(response);
};

export const useUpdateProductMutation = (): UseMutationResult<Product, Error, UpdateProductVariables> => {
  const queryClient = useQueryClient();

  return useMutation<Product, Error, UpdateProductVariables>({
    mutationFn: updateProduct,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.id) });
    },
  });
};
