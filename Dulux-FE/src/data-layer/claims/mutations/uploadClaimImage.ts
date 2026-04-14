import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints } from '#/constants';
import { performRequest } from '#/services/apiClient';

interface UploadClaimImageResponse {
  id: number;
}

export const uploadClaimImage = async (image: File): Promise<number> => {
  const payload = new FormData();
  payload.append('image', image);

  const response = await performRequest<UploadClaimImageResponse, FormData>({
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

export const useUploadClaimImageMutation = (): UseMutationResult<number, Error, File> => {
  return useMutation<number, Error, File>({
    mutationFn: uploadClaimImage,
  });
};
