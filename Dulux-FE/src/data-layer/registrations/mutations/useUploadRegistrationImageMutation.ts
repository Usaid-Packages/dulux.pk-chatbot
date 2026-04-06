import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints } from '#/constants';
import { performRequest } from '#/services';

interface UploadImageResponse {
  id: number;
}

export interface UploadRegistrationImagePayload {
  image: File;
}

export const uploadRegistrationImageRequest = async ({ image }: UploadRegistrationImagePayload): Promise<number> => {
  const payload = new FormData();
  payload.append('image', image);

  const response = await performRequest<UploadImageResponse, FormData>({
    method: 'post',
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

/**
 * Uploads a single image and returns the uploaded image id.
 *
 * @returns Upload image mutation result.
 */

export const useUploadRegistrationImageMutation = (): UseMutationResult<
  number,
  Error,
  UploadRegistrationImagePayload
> => {
  return useMutation<number, Error, UploadRegistrationImagePayload>({
    mutationFn: uploadRegistrationImageRequest,
  });
};
