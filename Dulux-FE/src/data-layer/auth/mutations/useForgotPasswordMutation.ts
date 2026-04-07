import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, POST, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { ForgotPasswordPayload, ForgotPasswordResponse } from '#/types/auth.types';

interface PasswordResetMessageApiResponse {
  detail: string;
}

export const useForgotPasswordMutation = (): UseMutationResult<
  ForgotPasswordResponse,
  Error,
  ForgotPasswordPayload
> => {
  return useMutation<ForgotPasswordResponse, Error, ForgotPasswordPayload>({
    mutationKey: [queryKeys.auth.forgotPassword],
    mutationFn: async (payload: ForgotPasswordPayload): Promise<ForgotPasswordResponse> => {
      const response = await performRequest<PasswordResetMessageApiResponse, ForgotPasswordPayload>({
        method: POST,
        url: apiEndpoints.auth.forgotPassword,
        payload,
      });

      return {
        message: response.detail ?? 'Request completed successfully.',
      };
    },
  });
};
