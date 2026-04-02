import { useMutation } from '@tanstack/react-query';

import { queryKeys } from '#/constants';
import { logout } from '#/services/authService';
import type { LogoutPayload, LogoutResponse } from '#/types/auth.types';

export const useLogoutMutation = () => {
  return useMutation<LogoutResponse, Error, LogoutPayload>({
    mutationKey: [queryKeys.auth.logout],
    mutationFn: logout,
  });
};
