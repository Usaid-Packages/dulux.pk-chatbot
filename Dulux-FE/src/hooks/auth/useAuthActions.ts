import { useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ROUTES } from '#/constants';
import { useAuth } from '#/context';
import { useForgotPasswordMutation, useLoginMutation, useLogoutMutation } from '#/data-layer/auth';
import type { ForgotPasswordFormValues, LoginFormValues } from '#/schemas/authSchemas';
import type { LogoutPayload } from '#/types/auth.types';
import { getApiErrorMessage } from '#/utils';

export const useAuthActions = () => {
  const [forgotPasswordErrorMessage, setForgotPasswordErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login, logout, refreshToken } = useAuth();
  const loginMutation = useLoginMutation();
  const forgotPasswordMutation = useForgotPasswordMutation();
  const logoutMutation = useLogoutMutation();

  const handleLogin = async (values: LoginFormValues): Promise<void> => {
    try {
      const response = await loginMutation.mutateAsync(values);
      login(response);
      toast.success('Welcome back.');
      navigate(ROUTES.HOME, { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleForgotPassword = async (values: ForgotPasswordFormValues): Promise<void> => {
    setForgotPasswordErrorMessage(null);

    try {
      const response = await forgotPasswordMutation.mutateAsync(values);
      toast.success(response.message || 'Password reset instructions sent.');
      setForgotPasswordErrorMessage(null);
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setForgotPasswordErrorMessage(message);
      toast.error(message);
    }
  };

  const handleLogout = async (): Promise<void> => {
    const payload: LogoutPayload | null = refreshToken ? { refreshToken } : null;

    try {
      if (payload) {
        await logoutMutation.mutateAsync(payload);
      }
      toast.success('You have been logged out.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      logout();
      navigate(ROUTES.LOGIN, { replace: true });
    }
  };

  return {
    handleLogin,
    handleForgotPassword,
    handleLogout,
    isLoginPending: loginMutation.isPending,
    isForgotPasswordPending: forgotPasswordMutation.isPending,
    forgotPasswordErrorMessage,
    isLogoutPending: logoutMutation.isPending,
  };
};
