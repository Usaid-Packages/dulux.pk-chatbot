import type React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAuthContext } from '#/context';
import { useForgotPassword, useLogin, useResetPassword } from '#/hooks';
import { ForgotPasswordPage } from '../ForgotPasswordPage';
import { LoginPage } from '../LoginPage';
import { ResetPasswordPage } from '../ResetPasswordPage';

vi.mock('#/components/auth', () => ({
  AuthShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AuthCard: ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
    <section>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </section>
  ),
  LoginForm: ({ isSubmitting, onSubmit }: { isSubmitting: boolean; onSubmit: () => void }) => (
    <button type='button' onClick={onSubmit}>
      {isSubmitting ? 'Login Pending' : 'Login Submit'}
    </button>
  ),
  ForgotPasswordForm: ({
    isSubmitting,
    errorMessage,
    onSubmit,
  }: {
    isSubmitting: boolean;
    errorMessage: string;
    onSubmit: () => void;
  }) => (
    <div>
      <p>{errorMessage}</p>
      <button type='button' onClick={onSubmit}>
        {isSubmitting ? 'Forgot Pending' : 'Forgot Submit'}
      </button>
    </div>
  ),
  ResetPasswordForm: ({
    isSubmitting,
    errorMessage,
    onSubmit,
  }: {
    isSubmitting: boolean;
    errorMessage: string;
    onSubmit: () => void;
  }) => (
    <div>
      <p>{errorMessage}</p>
      <button type='button' onClick={onSubmit}>
        {isSubmitting ? 'Reset Pending' : 'Reset Submit'}
      </button>
    </div>
  ),
}));

vi.mock('#/context', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock('#/hooks', () => ({
  useLogin: vi.fn(),
  useForgotPassword: vi.fn(),
  useResetPassword: vi.fn(),
}));

const mockedUseAuthContext = vi.mocked(useAuthContext);
const mockedUseLogin = vi.mocked(useLogin);
const mockedUseForgotPassword = vi.mocked(useForgotPassword);
const mockedUseResetPassword = vi.mocked(useResetPassword);

describe('Auth pages', () => {
  it('renders login page and submits login', () => {
    const handleLogin = vi.fn();

    mockedUseAuthContext.mockReturnValue({ token: null, user: null } as unknown as ReturnType<typeof useAuthContext>);
    mockedUseLogin.mockReturnValue({
      handleLogin,
      isLoginPending: false,
    } as unknown as ReturnType<typeof useLogin>);

    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Login Submit' }));

    expect(handleLogin).toHaveBeenCalledTimes(1);
  });

  it('renders forgot-password page with error and submits', () => {
    const handleForgotPassword = vi.fn();

    mockedUseAuthContext.mockReturnValue({ token: null, user: null } as unknown as ReturnType<typeof useAuthContext>);
    mockedUseForgotPassword.mockReturnValue({
      handleForgotPassword,
      isForgotPasswordPending: false,
      forgotPasswordErrorMessage: 'Email not found',
    } as unknown as ReturnType<typeof useForgotPassword>);

    render(<ForgotPasswordPage />);

    expect(screen.getByRole('heading', { name: 'Forgot Password' })).toBeInTheDocument();
    expect(screen.getByText('Email not found')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Forgot Submit' }));

    expect(handleForgotPassword).toHaveBeenCalledTimes(1);
  });

  it('renders reset-password page and submits', () => {
    const handleResetPassword = vi.fn();

    mockedUseAuthContext.mockReturnValue({ token: null, user: null } as unknown as ReturnType<typeof useAuthContext>);
    mockedUseResetPassword.mockReturnValue({
      handleResetPassword,
      isResetPasswordPending: false,
      resetPasswordErrorMessage: '',
    } as unknown as ReturnType<typeof useResetPassword>);

    render(<ResetPasswordPage />);

    expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset Submit' }));

    expect(handleResetPassword).toHaveBeenCalledTimes(1);
  });
});
