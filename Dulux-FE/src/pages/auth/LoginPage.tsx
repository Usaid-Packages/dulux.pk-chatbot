import type { JSX } from 'react';

import { Navigate } from 'react-router-dom';

import { AuthCard, LoginForm } from '#/components/auth';
import { ROUTES } from '#/constants';
import { useAuth } from '#/context';
import { useLoginAction } from '#/hooks';

/**
 * LoginPage composes login-specific UI and hooks for authentication.
 *
 * @returns Login page component.
 */
export const LoginPage = (): JSX.Element => {
  const { token } = useAuth();
  const { handleLogin, isLoginPending } = useLoginAction();

  if (token) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return (
    <main className='flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/40 px-4 py-12'>
      <AuthCard
        title='Welcome to Dulux Customer Service'
        subtitle='Sign in to continue managing the Dulux Customer Service workflows.'
      >
        <LoginForm isSubmitting={isLoginPending} onSubmit={handleLogin} />
      </AuthCard>
    </main>
  );
};
