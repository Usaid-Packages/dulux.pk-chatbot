import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ROUTES } from '#/constants';
import { useAuthContext } from '#/context';
import { useLoginMutation } from '#/data-layer/auth';
import type { LoginFormValues } from '#/schemas/authSchemas';
import { getApiErrorMessage } from '#/utils';

export const useLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuthContext();
  const loginMutation = useLoginMutation();

  const handleLogin = (values: LoginFormValues): void => {
    loginMutation.mutate(values, {
      onSuccess: response => {
        login(response);
        toast.success('Logged in successfully.');
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
