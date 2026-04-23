import type { InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';

import { ACCESS_TOKEN, apiEndpoints, REFRESH_TOKEN } from '#/constants';
import { clearAuthSession, getLocalStorageItem, setLocalStorageItem } from '#/utils';
import env from '#env';
import axiosInstance from './axiosInstance';

interface RefreshTokenResponse {
  access: string;
  refresh?: string;
}

type UnauthorizedListener = () => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

const notifyUnauthorizedListeners = (): void => {
  unauthorizedListeners.forEach(listener => {
    listener();
  });
};

export const subscribeUnauthorized = (listener: UnauthorizedListener): (() => void) => {
  unauthorizedListeners.add(listener);

  return () => {
    unauthorizedListeners.delete(listener);
  };
};

const handleLogout = (error: unknown) => {
  clearAuthSession();
  notifyUnauthorizedListeners();
  return Promise.reject(error);
};

export const handleUnauthorized = async (error: unknown) => {
  const err = error as { config?: InternalAxiosRequestConfig & { _isRetry?: boolean } };
  const originalRequest = err.config;

  if (!originalRequest) {
    return Promise.reject(error);
  }

  if (originalRequest._isRetry) {
    return handleLogout(error);
  }

  const refreshToken = getLocalStorageItem<string>(REFRESH_TOKEN);
  if (!refreshToken) {
    return handleLogout(error);
  }

  originalRequest._isRetry = true;

  try {
    const { data } = await axios.post<RefreshTokenResponse>(
      `${env.VITE_BACKEND_BASE_URL}${apiEndpoints.auth.refresh}`,
      {
        refresh: refreshToken,
      }
    );

    setLocalStorageItem(ACCESS_TOKEN, data.access);
    if (data.refresh) {
      setLocalStorageItem(REFRESH_TOKEN, data.refresh);
    }

    originalRequest.headers.Authorization = `Bearer ${data.access}`;
    return axiosInstance(originalRequest);
  } catch {
    return handleLogout(error);
  }
};
