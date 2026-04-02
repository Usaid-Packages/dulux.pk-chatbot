import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { queryKeys } from '#/constants';
import { resetPassword } from '#/services/authService';
import type { ResetPasswordPayload, ResetPasswordResponse } from '#/types/auth.types';

export const useResetPasswordMutation = (): UseMutationResult<ResetPasswordResponse, Error, ResetPasswordPayload> => {
  return useMutation<ResetPasswordResponse, Error, ResetPasswordPayload>({
    mutationKey: [queryKeys.auth.resetPassword],
    mutationFn: resetPassword,
  });
};
