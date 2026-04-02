import type { JSX } from 'react';

import { Navigate } from 'react-router-dom';

import { AuthCard, ForgotPasswordForm } from '#/components/auth';
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
    <main className='flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/40 px-4 py-12'>
      <AuthCard title='Forgot your password?' subtitle='Enter your email and we will send reset instructions.'>
        <ForgotPasswordForm
          isSubmitting={isForgotPasswordPending}
          errorMessage={forgotPasswordErrorMessage}
          onSubmit={handleForgotPassword}
        />
      </AuthCard>
    </main>
  );
};
