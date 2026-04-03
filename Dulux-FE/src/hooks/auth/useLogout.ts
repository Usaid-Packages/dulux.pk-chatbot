import { toast } from 'react-toastify';

import { useAuthContext } from '#/context';

export const useLogout = () => {
  const { logout } = useAuthContext();

  const handleLogout = (): void => {
    logout();
    toast.success('You have been logged out.');
  };

  return {
    handleLogout,
    isLogoutPending: false,
  };
};
