import { useState } from 'react';

import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ROUTES } from '#/constants';
import { useResetPasswordMutation } from '#/data-layer/auth';
import type { ResetPasswordFormValues } from '#/schemas/authSchemas';
import { getApiErrorMessage } from '#/utils';

interface UseResetPasswordResult {
  handleResetPassword: (values: ResetPasswordFormValues) => void;
  isResetPasswordPending: boolean;
  resetPasswordErrorMessage: string | null;
}

export const useResetPassword = (): UseResetPasswordResult => {
  const [resetPasswordErrorMessage, setResetPasswordErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams<{ uid?: string; token?: string }>();
  const { mutate: resetPasswordMutate, isPending: isResetPasswordPending } = useResetPasswordMutation();

  const handleResetPassword = (values: ResetPasswordFormValues): void => {
    const uid = params.uid ?? searchParams.get('uid') ?? undefined;
    const token = params.token ?? searchParams.get('token') ?? undefined;
    setResetPasswordErrorMessage(null);

    resetPasswordMutate(
      { ...values, uid, token },
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
    isResetPasswordPending,
    resetPasswordErrorMessage,
  };
};
