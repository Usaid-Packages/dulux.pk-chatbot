import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, POST } from '#/constants';
import { performRequest } from '#/services';
import type { UploadProductImageResponse } from '#/types/products';

export const useUploadProductImageMutation = (): UseMutationResult<number, Error, File> => {
  return useMutation<number, Error, File>({
    mutationFn: async (file): Promise<number> => {
      const payload = new FormData();
      payload.append('image', file);

      const response = await performRequest<UploadProductImageResponse, FormData>({
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
    },
  });
};
