import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import { productMockStore } from '../mockStore';
import { shouldUseMockProducts } from '../transport';

const deleteProduct = async (id: string): Promise<void> => {
  if (shouldUseMockProducts()) {
    await productMockStore.deleteProduct(id);
    return;
  }

  await performRequest<void>({
    method: 'delete',
    url: apiEndpoints.products.detail(id),
  });
};

export const useDeleteProductMutation = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
};
