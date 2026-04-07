import type { JSX } from 'react';

import { Navigate } from 'react-router-dom';

import { AuthCard, AuthShell, ResetPasswordForm } from '#/components/auth';
import { ROUTES } from '#/constants';
import { useAuthContext } from '#/context';
import { useResetPassword } from '#/hooks';

/**
 * ResetPasswordPage composes reset-password UI and behavior.
 *
 * @returns Reset password page component.
 */
export const ResetPasswordPage = (): JSX.Element => {
  const { token } = useAuthContext();
  const { handleResetPassword, isResetPasswordPending, resetPasswordErrorMessage } = useResetPassword();

  if (token) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return (
    <AuthShell>
      <AuthCard title='Reset Password' subtitle='Create a new password to continue with secure access.'>
        <ResetPasswordForm
          isSubmitting={isResetPasswordPending}
          errorMessage={resetPasswordErrorMessage}
          onSubmit={handleResetPassword}
        />
      </AuthCard>
    </AuthShell>
  );
};
