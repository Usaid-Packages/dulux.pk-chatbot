import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ROUTES } from '#/constants';
import { useAuthContext } from '#/context';
import { useLoginMutation } from '#/data-layer/auth';
import type { LoginFormValues } from '#/schemas/authSchemas';
import type { LoginApiResponse, LoginResponse } from '#/types/auth.types';
import { getApiErrorMessage } from '#/utils';

export const useLogin = () => {
  const navigate = useNavigate();
  const { login: setAuthSession } = useAuthContext();
  const { mutate: loginMutate, isPending: isLoginPending } = useLoginMutation();

  const mapLoginResponse = (response: LoginApiResponse): LoginResponse => {
    return {
      token: response.access,
      refreshToken: response.refresh,
      user: {
        id: response.user.id,
        email: response.user.email,
        role: response.user.role,
      },
    };
  };

  const handleLogin = (values: LoginFormValues): void => {
    loginMutate(values, {
      onSuccess: (response: LoginApiResponse) => {
        setAuthSession(mapLoginResponse(response));
        toast.success('Logged in successfully.');
        navigate(ROUTES.HOME, { replace: true });
      },
      onError: (error: Error) => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  return {
    handleLogin,
    isLoginPending,
  };
};
