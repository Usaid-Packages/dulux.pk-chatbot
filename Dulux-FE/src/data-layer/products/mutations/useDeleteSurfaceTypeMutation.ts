import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services';

const deleteSurfaceType = async (id: string): Promise<void> => {
  await performRequest<void>({
    method: 'delete',
    url: apiEndpoints.products.surfaceTypeDetail(id),
  });
};

export const useDeleteSurfaceTypeMutation = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteSurfaceType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surfaceTypes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
};
