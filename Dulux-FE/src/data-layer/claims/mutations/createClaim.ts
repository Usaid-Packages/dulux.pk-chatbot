import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services/apiClient';
import type { CreateClaimRequestPayload } from '#/types/claims.api.types';
import type { CreateClaimPayload } from '#/types/claims.types';
import { toCreateClaimPayload } from '../payloadHelpers';

interface UploadImageResponse {
  id: number;
}

const uploadClaimImage = async (image: File): Promise<number> => {
  const payload = new FormData();
  payload.append('image', image);

  const response = await performRequest<UploadImageResponse, FormData>({
    method: POST,
    url: apiEndpoints.core.uploadImage,
    payload,
    config: {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  });

  return response.id;
};

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
