/* eslint import/order: off */
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, DELETE, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { RemoveProductImagePayload } from '#/types/products';

const removeProductImage = async ({ productId, imageId }: RemoveProductImagePayload): Promise<void> => {
  await performRequest<void>({
    method: DELETE,
    url: apiEndpoints.products.imageDetail(productId, imageId),
  });
};

export const useRemoveProductImageMutation = (): UseMutationResult<void, Error, RemoveProductImagePayload> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, RemoveProductImagePayload>({
    mutationFn: removeProductImage,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.images(variables.productId) });
    },
  });
};
