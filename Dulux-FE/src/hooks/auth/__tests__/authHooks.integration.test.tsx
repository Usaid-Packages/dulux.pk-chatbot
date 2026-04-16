import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useForgotPassword, useLogin, useResetPassword } from '#/hooks/auth';

const mockNavigate = vi.fn();
const mockLoginMutate = vi.fn();
const mockForgotMutate = vi.fn();
const mockResetMutate = vi.fn();
const mockAuthLogin = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockGetApiErrorMessage = vi.fn();

const routeParams = { uid: undefined as string | undefined, token: undefined as string | undefined };
const searchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => routeParams,
    useSearchParams: () => [searchParams] as const,
  };
});

vi.mock('react-toastify', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock('#/context', () => ({
  useAuthContext: () => ({
    login: mockAuthLogin,
  }),
}));

vi.mock('#/data-layer/auth', () => ({
  useLoginMutation: () => ({ mutate: mockLoginMutate, isPending: false }),
  useForgotPasswordMutation: () => ({ mutate: mockForgotMutate, isPending: false }),
  useResetPasswordMutation: () => ({ mutate: mockResetMutate, isPending: false }),
}));

vi.mock('#/utils', () => ({
  getApiErrorMessage: (error: Error) => mockGetApiErrorMessage(error),
}));

describe('auth hooks integration', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLoginMutate.mockReset();
    mockForgotMutate.mockReset();
    mockResetMutate.mockReset();
    mockAuthLogin.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockGetApiErrorMessage.mockReset();

    mockGetApiErrorMessage.mockReturnValue('Mapped API error');

    routeParams.uid = undefined;
    routeParams.token = undefined;
    searchParams.delete('uid');
    searchParams.delete('token');
  });

  it('useLogin maps successful API response, stores session, and navigates to role home', () => {
    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.handleLogin({ email: 'agent@dulux.pk', password: 'password123' });
    });

    const mutateOptions = mockLoginMutate.mock.calls[0]?.[1] as {
      onSuccess: (response: {
        access: string;
        refresh: string;
        user: { id: number; email: string; role: string };
      }) => void;
    };

    act(() => {
      mutateOptions.onSuccess({
        access: 'access-1',
        refresh: 'refresh-1',
        user: { id: 9, email: 'agent@dulux.pk', role: 'quality' },
      });
    });

    expect(mockAuthLogin).toHaveBeenCalledWith({
      token: 'access-1',
      refreshToken: 'refresh-1',
      user: { id: 9, email: 'agent@dulux.pk', role: 'quality' },
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('Logged in successfully.');
    expect(mockNavigate).toHaveBeenCalledWith('/quality', { replace: true });
  });

  it('useForgotPassword stores mapped error on mutation failure', () => {
    const { result } = renderHook(() => useForgotPassword());

    act(() => {
      result.current.handleForgotPassword({ email: 'agent@dulux.pk' });
    });

    const mutateOptions = mockForgotMutate.mock.calls[0]?.[1] as { onError: (error: Error) => void };

    act(() => {
      mutateOptions.onError(new Error('network'));
    });

    expect(result.current.forgotPasswordErrorMessage).toBe('Mapped API error');
  });

  it('useResetPassword reads uid/token from search params and redirects on success', () => {
    searchParams.set('uid', 'uid-from-search');
    searchParams.set('token', 'token-from-search');

    const { result } = renderHook(() => useResetPassword());

    act(() => {
      result.current.handleResetPassword({ password: 'new-password-123', confirmPassword: 'new-password-123' });
    });

    expect(mockResetMutate).toHaveBeenCalledWith(
      {
        password: 'new-password-123',
        confirmPassword: 'new-password-123',
        uid: 'uid-from-search',
        token: 'token-from-search',
      },
      expect.any(Object)
    );

    const mutateOptions = mockResetMutate.mock.calls[0]?.[1] as {
      onSuccess: (response: { message: string }) => void;
    };

    act(() => {
      mutateOptions.onSuccess({ message: 'Reset ok' });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Reset ok');
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
