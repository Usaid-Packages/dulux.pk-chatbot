import type { ReactNode } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES, getHomeRouteByRole } from '#/constants';
import { useAuthContext } from '#/context';
import { useForgotPassword, useLogin, useResetPassword } from '#/hooks';
import { ForgotPasswordPage } from '../ForgotPasswordPage';
import { LoginPage } from '../LoginPage';
import { ResetPasswordPage } from '../ResetPasswordPage';

const mockHandleLogin = vi.fn();
const mockHandleForgotPassword = vi.fn();
const mockHandleResetPassword = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid='navigate-target'>{to}</div>,
  };
});

vi.mock('#/components/auth', () => ({
  AuthShell: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  AuthCard: ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
    <article>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </article>
  ),
  LoginForm: ({
    isSubmitting,
    onSubmit,
  }: {
    isSubmitting: boolean;
    onSubmit: (values: Record<string, string>) => void;
  }) => {
    const handleSubmit = (): void => {
      onSubmit({ email: 'agent@dulux.pk', password: 'password123' });
    };

    return (
      <div>
        <p>Login Pending: {String(isSubmitting)}</p>
        <button type='button' onClick={handleSubmit}>
          Submit Login
        </button>
      </div>
    );
  },
  ForgotPasswordForm: ({
    isSubmitting,
    errorMessage,
    onSubmit,
  }: {
    isSubmitting: boolean;
    errorMessage: string;
    onSubmit: (values: Record<string, string>) => void;
  }) => {
    const handleSubmit = (): void => {
      onSubmit({ email: 'agent@dulux.pk' });
    };

    return (
      <div>
        <p>Forgot Pending: {String(isSubmitting)}</p>
        <p>{errorMessage}</p>
        <button type='button' onClick={handleSubmit}>
          Submit Forgot
        </button>
      </div>
    );
  },
  ResetPasswordForm: ({
    isSubmitting,
    errorMessage,
    onSubmit,
  }: {
    isSubmitting: boolean;
    errorMessage: string;
    onSubmit: (values: Record<string, string>) => void;
  }) => {
    const handleSubmit = (): void => {
      onSubmit({ password: 'new-password-123', confirmPassword: 'new-password-123' });
    };

    return (
      <div>
        <p>Reset Pending: {String(isSubmitting)}</p>
        <p>{errorMessage}</p>
        <button type='button' onClick={handleSubmit}>
          Submit Reset
        </button>
      </div>
    );
  },
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
  beforeEach(() => {
    mockHandleLogin.mockReset();
    mockHandleForgotPassword.mockReset();
    mockHandleResetPassword.mockReset();

    mockedUseAuthContext.mockReturnValue({ token: null, user: null } as unknown as ReturnType<typeof useAuthContext>);

    mockedUseLogin.mockReturnValue({
      handleLogin: mockHandleLogin,
      isLoginPending: false,
    } as unknown as ReturnType<typeof useLogin>);

    mockedUseForgotPassword.mockReturnValue({
      handleForgotPassword: mockHandleForgotPassword,
      isForgotPasswordPending: false,
      forgotPasswordErrorMessage: '',
    } as unknown as ReturnType<typeof useForgotPassword>);

    mockedUseResetPassword.mockReturnValue({
      handleResetPassword: mockHandleResetPassword,
      isResetPasswordPending: false,
      resetPasswordErrorMessage: '',
    } as unknown as ReturnType<typeof useResetPassword>);
  });

  it('renders login form and submits credentials', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Login' }));

    expect(mockHandleLogin).toHaveBeenCalledWith({ email: 'agent@dulux.pk', password: 'password123' });
  });

  it('redirects authenticated users from login page to role home', () => {
    mockedUseAuthContext.mockReturnValue({
      token: 'token-123',
      user: { role: 'quality' },
    } as unknown as ReturnType<typeof useAuthContext>);

    render(<LoginPage />);

    expect(screen.getByTestId('navigate-target')).toHaveTextContent(getHomeRouteByRole('quality'));
  });

  it('renders forgot-password form and passes error state + submit handler', () => {
    mockedUseForgotPassword.mockReturnValue({
      handleForgotPassword: mockHandleForgotPassword,
      isForgotPasswordPending: true,
      forgotPasswordErrorMessage: 'Email not found',
    } as unknown as ReturnType<typeof useForgotPassword>);

    render(<ForgotPasswordPage />);

    expect(screen.getByRole('heading', { name: 'Forgot Password' })).toBeInTheDocument();
    expect(screen.getByText('Email not found')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Forgot' }));

    expect(mockHandleForgotPassword).toHaveBeenCalledWith({ email: 'agent@dulux.pk' });
  });

  it('redirects authenticated users from forgot-password page', () => {
    mockedUseAuthContext.mockReturnValue({
      token: 'token-123',
      user: { role: 'admin' },
    } as unknown as ReturnType<typeof useAuthContext>);

    render(<ForgotPasswordPage />);

    expect(screen.getByTestId('navigate-target')).toHaveTextContent(ROUTES.HOME);
  });

  it('renders reset-password form and submits new password values', () => {
    mockedUseResetPassword.mockReturnValue({
      handleResetPassword: mockHandleResetPassword,
      isResetPasswordPending: false,
      resetPasswordErrorMessage: 'Token expired',
    } as unknown as ReturnType<typeof useResetPassword>);

    render(<ResetPasswordPage />);

    expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
    expect(screen.getByText('Token expired')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Reset' }));

    expect(mockHandleResetPassword).toHaveBeenCalledWith({
      password: 'new-password-123',
      confirmPassword: 'new-password-123',
    });
  });

  it('redirects authenticated users from reset-password page', () => {
    mockedUseAuthContext.mockReturnValue({
      token: 'token-123',
      user: { role: 'cs' },
    } as unknown as ReturnType<typeof useAuthContext>);

    render(<ResetPasswordPage />);

    expect(screen.getByTestId('navigate-target')).toHaveTextContent(ROUTES.HOME);
  });
});
