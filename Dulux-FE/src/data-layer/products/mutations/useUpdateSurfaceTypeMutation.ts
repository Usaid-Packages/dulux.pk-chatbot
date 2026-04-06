import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { SurfaceType, SurfaceTypeMutationPayload } from '#/types/products';
import { normalizeSurfaceType, type SurfaceTypeApiResponse } from '../queries/shared';

interface UpdateSurfaceTypeVariables {
  id: string;
  payload: SurfaceTypeMutationPayload;
}

const updateSurfaceType = async ({ id, payload }: UpdateSurfaceTypeVariables): Promise<SurfaceType> => {
  const response = await performRequest<SurfaceTypeApiResponse, SurfaceTypeMutationPayload>({
    method: 'patch',
    url: apiEndpoints.products.surfaceTypeDetail(id),
    payload,
  });

  return normalizeSurfaceType(response);
};

export const useUpdateSurfaceTypeMutation = (): UseMutationResult<SurfaceType, Error, UpdateSurfaceTypeVariables> => {
  const queryClient = useQueryClient();

  return useMutation<SurfaceType, Error, UpdateSurfaceTypeVariables>({
    mutationFn: updateSurfaceType,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surfaceTypes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.surfaceTypes.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
};
