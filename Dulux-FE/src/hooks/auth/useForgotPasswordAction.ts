import { useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ROUTES } from '#/constants';
import { useForgotPasswordMutation } from '#/data-layer/auth';
import type { ForgotPasswordFormValues } from '#/schemas/authSchemas';
import { getApiErrorMessage } from '#/utils';

export const useForgotPasswordAction = () => {
  const [forgotPasswordErrorMessage, setForgotPasswordErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const forgotPasswordMutation = useForgotPasswordMutation();

  const handleForgotPassword = (values: ForgotPasswordFormValues): void => {
    setForgotPasswordErrorMessage(null);

    forgotPasswordMutation.mutate(values, {
      onSuccess: response => {
        toast.success(response.message || 'Password reset instructions sent.');
        navigate(ROUTES.LOGIN, { replace: true });
      },
      onError: error => {
        const message = getApiErrorMessage(error);
        setForgotPasswordErrorMessage(message);
        toast.error(message);
      },
    });
  };

  return {
    handleForgotPassword,
    isForgotPasswordPending: forgotPasswordMutation.isPending,
    forgotPasswordErrorMessage,
  };
};
