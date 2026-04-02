import { toast } from 'react-toastify';

import { useAuthContext } from '#/context';
import { useLogoutMutation } from '#/data-layer/auth';
import type { LogoutPayload } from '#/types/auth.types';
import { getApiErrorMessage } from '#/utils';

export const useLogout = () => {
  const { logout, refreshToken } = useAuthContext();
  const logoutMutation = useLogoutMutation();

  const handleLogout = (): void => {
    const payload: LogoutPayload | null = refreshToken ? { refreshToken } : null;

    if (!payload) {
      logout();
      toast.success('You have been logged out.');
      return;
    }

    logoutMutation.mutate(payload, {
      onSuccess: () => {
        logout();
        toast.success('You have been logged out.');
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  return {
    handleLogout,
    isLogoutPending: logoutMutation.isPending,
  };
};
