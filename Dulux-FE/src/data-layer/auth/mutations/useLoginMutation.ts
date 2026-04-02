import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { queryKeys } from '#/constants';
import { login } from '#/services/authService';
import type { LoginPayload, LoginResponse } from '#/types/auth.types';

export const useLoginMutation = (): UseMutationResult<LoginResponse, Error, LoginPayload> => {
  return useMutation<LoginResponse, Error, LoginPayload>({
    mutationKey: [queryKeys.auth.login],
    mutationFn: login,
  });
};
