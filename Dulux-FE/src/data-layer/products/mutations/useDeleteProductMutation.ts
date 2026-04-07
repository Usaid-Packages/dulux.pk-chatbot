import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, DELETE, queryKeys } from '#/constants';
import { performRequest } from '#/services';

const deleteProduct = async (id: string): Promise<void> => {
  await performRequest<void>({
    method: DELETE,
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
