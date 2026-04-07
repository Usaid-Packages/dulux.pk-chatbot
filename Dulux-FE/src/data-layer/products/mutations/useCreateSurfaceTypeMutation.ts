import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, POST, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { SurfaceType, SurfaceTypeMutationPayload } from '#/types/products';
import { normalizeSurfaceType, type SurfaceTypeApiResponse } from '../queries/shared';

const createSurfaceType = async (payload: SurfaceTypeMutationPayload): Promise<SurfaceType> => {
  const response = await performRequest<SurfaceTypeApiResponse, SurfaceTypeMutationPayload>({
    method: POST,
    url: apiEndpoints.products.surfaceTypes,
    payload,
  });

  return normalizeSurfaceType(response);
};

export const useCreateSurfaceTypeMutation = (): UseMutationResult<SurfaceType, Error, SurfaceTypeMutationPayload> => {
  const queryClient = useQueryClient();

  return useMutation<SurfaceType, Error, SurfaceTypeMutationPayload>({
    mutationFn: createSurfaceType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surfaceTypes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
};
