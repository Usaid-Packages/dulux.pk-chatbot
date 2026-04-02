import type { JSX } from 'react';

import { Navigate } from 'react-router-dom';

import { AuthCard, ResetPasswordForm } from '#/components/auth';
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
    <main className='flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/40 px-4 py-12'>
      <AuthCard title='Reset your password' subtitle='Create a new password to continue.'>
        <ResetPasswordForm
          isSubmitting={isResetPasswordPending}
          errorMessage={resetPasswordErrorMessage}
          onSubmit={handleResetPassword}
        />
      </AuthCard>
    </main>
  );
};
