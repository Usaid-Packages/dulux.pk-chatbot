import { useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ROUTES } from '#/constants';
import { useForgotPasswordMutation } from '#/data-layer/auth';
import type { ForgotPasswordFormValues } from '#/schemas/authSchemas';
import { getApiErrorMessage } from '#/utils';

interface UseForgotPasswordResult {
  handleForgotPassword: (values: ForgotPasswordFormValues) => void;
  isForgotPasswordPending: boolean;
  forgotPasswordErrorMessage: string | null;
}

export const useForgotPassword = (): UseForgotPasswordResult => {
  const [forgotPasswordErrorMessage, setForgotPasswordErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { mutate: forgotPasswordMutate, isPending: isForgotPasswordPending } = useForgotPasswordMutation();

  const handleForgotPassword = (values: ForgotPasswordFormValues): void => {
    setForgotPasswordErrorMessage(null);

    forgotPasswordMutate(values, {
      onSuccess: response => {
        toast.success(response.message || 'Password reset instructions sent.');
        navigate(ROUTES.LOGIN, { replace: true });
      },
      onError: error => {
        setForgotPasswordErrorMessage(getApiErrorMessage(error));
      },
    });
  };

  return {
    handleForgotPassword,
    isForgotPasswordPending,
    forgotPasswordErrorMessage,
  };
};
