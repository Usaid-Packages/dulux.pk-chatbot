import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, POST, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { ResetPasswordPayload, ResetPasswordResponse } from '#/types/auth.types';

interface PasswordResetMessageApiResponse {
  detail: string;
}

/** Matches Django / dj-rest-auth `PasswordResetConfirmSerializer` field names on the wire. */
interface ResetPasswordApiPayload {
  uid: string;
  token: string;
  new_password1: string;
  new_password2: string;
}

const toResetPasswordApiPayload = (payload: ResetPasswordPayload): ResetPasswordApiPayload => {
  const { uid, token, password, confirmPassword } = payload;
  if (!uid || !token) {
    throw new Error('Reset password link is invalid. Missing uid or token.');
  }

  return {
    uid,
    token,
    new_password1: password,
    new_password2: confirmPassword,
  };
};

export const useResetPasswordMutation = (): UseMutationResult<ResetPasswordResponse, Error, ResetPasswordPayload> => {
  return useMutation<ResetPasswordResponse, Error, ResetPasswordPayload>({
    mutationKey: [queryKeys.auth.resetPassword],
    mutationFn: async (payload: ResetPasswordPayload): Promise<ResetPasswordResponse> => {
      const resetPayload = toResetPasswordApiPayload(payload);
      const response = await performRequest<PasswordResetMessageApiResponse, ResetPasswordApiPayload>({
        method: POST,
        url: apiEndpoints.auth.resetPassword,
        payload: resetPayload,
        config: {
          skipRequestCaseTransform: true,
        },
      });

      return {
        message: response.detail ?? 'Request completed successfully.',
      };
    },
  });
};
