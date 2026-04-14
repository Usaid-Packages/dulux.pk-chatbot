import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services/apiClient';
import type { CreateClaimRequestPayload } from '#/types/claims.api.types';
import type { CreateClaimPayload } from '#/types/claims.types';
import { uploadClaimImage } from './uploadClaimImage';
import { toCreateClaimPayload } from '../payloadHelpers';

export const createClaim = async (payload: CreateClaimPayload): Promise<void> => {
  const [longShotImageId, closeShotImageId, alternateAngleImageId] = await Promise.all([
    uploadClaimImage(payload.photos.longShot),
    uploadClaimImage(payload.photos.closeShot),
    uploadClaimImage(payload.photos.alternateAngle),
  ]);

  const requestPayload = toCreateClaimPayload(payload, {
    longShotImageId,
    closeShotImageId,
    alternateAngleImageId,
  });

  await performRequest<unknown, CreateClaimRequestPayload>({
    method: POST,
    url: apiEndpoints.claims.create,
    payload: requestPayload,
  });
};

export const useCreateClaimMutation = (): UseMutationResult<void, Error, CreateClaimPayload> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, CreateClaimPayload>({
    mutationKey: queryKeys.claims.create,
    mutationFn: createClaim,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.claims.all });
    },
  });
};
