// ignore this FILE right now.
// TODO: Implement the auth service.
// SERVER NOT AVAILABLE YET.

import { apiEndpoints, POST } from '#/constants';
import type {
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  LoginPayload,
  LoginResponse,
  LogoutPayload,
  LogoutResponse,
} from '#/types/auth.types';
import value from '#env';
import { performRequest } from './apiClient';

const NETWORK_ERROR_CODE = 'ERR_NETWORK';
const DEFAULT_MOCK_ACCESS_TOKEN = 'mock-access-token';
const DEFAULT_MOCK_REFRESH_TOKEN = 'mock-refresh-token';

const shouldUseMockAuth = (): boolean => {
  const rawValue = value.VITE_AUTH_MOCK_ENABLED;
  return rawValue === undefined || String(rawValue).toLowerCase() === 'true';
};

const isNetworkError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const typedError = error as { code?: string };
  return typedError.code === NETWORK_ERROR_CODE;
};

const createMockLoginResponse = (payload: LoginPayload): LoginResponse => {
  const [firstName = 'Dulux', lastName = 'User'] = payload.email.split('@')[0]?.split('.') ?? [];

  return {
    token: DEFAULT_MOCK_ACCESS_TOKEN,
    refreshToken: DEFAULT_MOCK_REFRESH_TOKEN,
    user: {
      id: 1,
      email: payload.email,
      firstName,
      lastName,
      role: 'agent',
    },
  };
};

export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
  try {
    return await performRequest<LoginResponse, LoginPayload>({
      method: POST,
      url: apiEndpoints.auth.login,
      payload,
    });
  } catch (error) {
    if (shouldUseMockAuth() && isNetworkError(error)) {
      return createMockLoginResponse(payload);
    }
    throw error;
  }
};

export const forgotPassword = async (payload: ForgotPasswordPayload): Promise<ForgotPasswordResponse> => {
  try {
    return await performRequest<ForgotPasswordResponse, ForgotPasswordPayload>({
      method: POST,
      url: apiEndpoints.auth.forgotPassword,
      payload,
    });
  } catch (error) {
    if (shouldUseMockAuth() && isNetworkError(error)) {
      return { message: 'Password reset instructions sent successfully.' };
    }
    throw error;
  }
};

export const logout = async (payload: LogoutPayload): Promise<LogoutResponse> => {
  try {
    return await performRequest<LogoutResponse, LogoutPayload>({
      method: POST,
      url: apiEndpoints.auth.logout,
      payload,
    });
  } catch (error) {
    if (shouldUseMockAuth() && isNetworkError(error)) {
      return { message: 'Logged out successfully.' };
    }
    throw error;
  }
};
