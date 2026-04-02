import { useState } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ROUTES } from '#/constants';
import { useResetPasswordMutation } from '#/data-layer/auth';
import type { ResetPasswordFormValues } from '#/schemas/authSchemas';
import { getApiErrorMessage } from '#/utils';

export const useResetPassword = () => {
  const [resetPasswordErrorMessage, setResetPasswordErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetPasswordMutation = useResetPasswordMutation();

  const handleResetPassword = (values: ResetPasswordFormValues): void => {
    const token = searchParams.get('token') ?? undefined;
    setResetPasswordErrorMessage(null);

    resetPasswordMutation.mutate(
      { ...values, token },
      {
        onSuccess: response => {
          toast.success(response.message || 'Password has been reset successfully.');
          navigate(ROUTES.LOGIN, { replace: true });
        },
        onError: error => {
          setResetPasswordErrorMessage(getApiErrorMessage(error));
        },
      }
    );
  };

  return {
    handleResetPassword,
    isResetPasswordPending: resetPasswordMutation.isPending,
    resetPasswordErrorMessage,
  };
};
