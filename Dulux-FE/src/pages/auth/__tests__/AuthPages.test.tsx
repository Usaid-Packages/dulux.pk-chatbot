<<<<<<< test/test-auth-quality-page
import type { ReactNode } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES, getHomeRouteByRole } from '#/constants';
=======
import type React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

>>>>>>> test/all-test-cases
import { useAuthContext } from '#/context';
import { useForgotPassword, useLogin, useResetPassword } from '#/hooks';
import { ForgotPasswordPage } from '../ForgotPasswordPage';
import { LoginPage } from '../LoginPage';
import { ResetPasswordPage } from '../ResetPasswordPage';

<<<<<<< test/test-auth-quality-page
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
=======
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
>>>>>>> test/all-test-cases
  ForgotPasswordForm: ({
    isSubmitting,
    errorMessage,
    onSubmit,
  }: {
    isSubmitting: boolean;
    errorMessage: string;
<<<<<<< test/test-auth-quality-page
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
=======
    onSubmit: () => void;
  }) => (
    <div>
      <p>{errorMessage}</p>
      <button type='button' onClick={onSubmit}>
        {isSubmitting ? 'Forgot Pending' : 'Forgot Submit'}
      </button>
    </div>
  ),
>>>>>>> test/all-test-cases
  ResetPasswordForm: ({
    isSubmitting,
    errorMessage,
    onSubmit,
  }: {
    isSubmitting: boolean;
    errorMessage: string;
<<<<<<< test/test-auth-quality-page
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
=======
    onSubmit: () => void;
  }) => (
    <div>
      <p>{errorMessage}</p>
      <button type='button' onClick={onSubmit}>
        {isSubmitting ? 'Reset Pending' : 'Reset Submit'}
      </button>
    </div>
  ),
>>>>>>> test/all-test-cases
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
<<<<<<< test/test-auth-quality-page
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
=======
  it('renders login page and submits login', () => {
    const handleLogin = vi.fn();

    mockedUseAuthContext.mockReturnValue({ token: null, user: null } as unknown as ReturnType<typeof useAuthContext>);
    mockedUseLogin.mockReturnValue({
      handleLogin,
      isLoginPending: false,
    } as unknown as ReturnType<typeof useLogin>);

>>>>>>> test/all-test-cases
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();

<<<<<<< test/test-auth-quality-page
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
=======
    fireEvent.click(screen.getByRole('button', { name: 'Login Submit' }));

    expect(handleLogin).toHaveBeenCalledTimes(1);
  });

  it('renders forgot-password page with error and submits', () => {
    const handleForgotPassword = vi.fn();

    mockedUseAuthContext.mockReturnValue({ token: null, user: null } as unknown as ReturnType<typeof useAuthContext>);
    mockedUseForgotPassword.mockReturnValue({
      handleForgotPassword,
      isForgotPasswordPending: false,
>>>>>>> test/all-test-cases
      forgotPasswordErrorMessage: 'Email not found',
    } as unknown as ReturnType<typeof useForgotPassword>);

    render(<ForgotPasswordPage />);

    expect(screen.getByRole('heading', { name: 'Forgot Password' })).toBeInTheDocument();
    expect(screen.getByText('Email not found')).toBeInTheDocument();

<<<<<<< test/test-auth-quality-page
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
=======
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
>>>>>>> test/all-test-cases
    } as unknown as ReturnType<typeof useResetPassword>);

    render(<ResetPasswordPage />);

    expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
<<<<<<< test/test-auth-quality-page
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
=======

    fireEvent.click(screen.getByRole('button', { name: 'Reset Submit' }));

    expect(handleResetPassword).toHaveBeenCalledTimes(1);
>>>>>>> test/all-test-cases
  });
});
