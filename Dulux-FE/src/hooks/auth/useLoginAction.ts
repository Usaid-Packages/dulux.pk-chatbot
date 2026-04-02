import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ROUTES } from '#/constants';
import { useAuth } from '#/context';
import { useLoginMutation } from '#/data-layer/auth';
import type { LoginFormValues } from '#/schemas/authSchemas';
import { getApiErrorMessage } from '#/utils';

export const useLoginAction = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const loginMutation = useLoginMutation();

  const handleLogin = (values: LoginFormValues): void => {
    loginMutation.mutate(values, {
      onSuccess: response => {
        login(response);
        toast.success('Welcome back.');
        navigate(ROUTES.HOME, { replace: true });
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  return {
    handleLogin,
    isLoginPending: loginMutation.isPending,
  };
};
