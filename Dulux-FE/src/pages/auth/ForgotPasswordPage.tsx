import type { JSX } from 'react';

import { Navigate } from 'react-router-dom';

import { AuthCard, AuthShell, ForgotPasswordForm } from '#/components/auth';
import { ROUTES } from '#/constants';
import { useAuthContext } from '#/context';
import { useForgotPassword } from '#/hooks';

/**
 * ForgotPasswordPage composes forgot-password UI and behavior.
 *
 * @returns Forgot password page component.
 */
export const ForgotPasswordPage = (): JSX.Element => {
  const { token } = useAuthContext();
  const { handleForgotPassword, isForgotPasswordPending, forgotPasswordErrorMessage } = useForgotPassword();

  if (token) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return (
    <AuthShell>
      <AuthCard title='Forgot Password' subtitle='Enter your email and we will send secure reset instructions.'>
        <ForgotPasswordForm
          isSubmitting={isForgotPasswordPending}
          errorMessage={forgotPasswordErrorMessage}
          onSubmit={handleForgotPassword}
        />
      </AuthCard>
    </AuthShell>
  );
};
