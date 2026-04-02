import { useMutation } from '@tanstack/react-query';

import { queryKeys } from '#/constants';
import { forgotPassword } from '#/services/authService';
import type { ForgotPasswordPayload, ForgotPasswordResponse } from '#/types/auth.types';

export const useForgotPasswordMutation = () => {
  return useMutation<ForgotPasswordResponse, Error, ForgotPasswordPayload>({
    mutationKey: [queryKeys.auth.forgotPassword],
    mutationFn: forgotPassword,
  });
};
