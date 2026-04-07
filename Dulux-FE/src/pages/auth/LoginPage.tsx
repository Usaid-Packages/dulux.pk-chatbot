import type { JSX } from 'react';

import { Navigate } from 'react-router-dom';

import { AuthCard, AuthShell, LoginForm } from '#/components/auth';
import { ROUTES } from '#/constants';
import { useAuthContext } from '#/context';
import { useLogin } from '#/hooks';

/**
 * LoginPage composes login-specific UI and hooks for authentication.
 *
 * @returns Login page component.
 */
export const LoginPage = (): JSX.Element => {
  const { token } = useAuthContext();
  const { handleLogin, isLoginPending } = useLogin();

  if (token) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return (
    <AuthShell>
      <AuthCard
        title='Welcome Back'
        subtitle='Sign in to continue managing claims, registrations, and support workflows.'
      >
        <LoginForm isSubmitting={isLoginPending} onSubmit={handleLogin} />
      </AuthCard>
    </AuthShell>
  );
};
