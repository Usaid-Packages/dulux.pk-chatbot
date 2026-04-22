import { toast } from 'react-toastify';

import { useAuthContext } from '#/context';

interface UseLogoutResult {
  handleLogout: () => void;
  isLogoutPending: boolean;
}

export const useLogout = (): UseLogoutResult => {
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
