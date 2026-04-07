import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, PATCH, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { Product, ProductMutationPayload } from '#/types/products';
import { normalizeProduct, type ProductApiResponse } from '../queries/shared';

interface UpdateProductVariables {
  id: string;
  payload: ProductMutationPayload;
}

export const useUpdateProductMutation = (): UseMutationResult<Product, Error, UpdateProductVariables> => {
  const queryClient = useQueryClient();

  return useMutation<Product, Error, UpdateProductVariables>({
    mutationFn: async ({ id, payload }): Promise<Product> => {
      const response = await performRequest<ProductApiResponse, ProductMutationPayload>({
        method: PATCH,
        url: apiEndpoints.products.detail(id),
        payload,
      });

      return normalizeProduct(response);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.id) });
    },
  });
};
