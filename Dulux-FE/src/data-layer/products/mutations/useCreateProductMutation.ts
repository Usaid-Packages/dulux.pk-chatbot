import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, POST, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { Product, ProductMutationPayload } from '#/types/products';
import { normalizeProduct, type ProductApiResponse } from '../queries/shared';

export const useCreateProductMutation = (): UseMutationResult<Product, Error, ProductMutationPayload> => {
  const queryClient = useQueryClient();

  return useMutation<Product, Error, ProductMutationPayload>({
    mutationFn: async (payload): Promise<Product> => {
      const response = await performRequest<ProductApiResponse, ProductMutationPayload>({
        method: POST,
        url: apiEndpoints.products.list,
        payload,
      });

      return normalizeProduct(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
};
