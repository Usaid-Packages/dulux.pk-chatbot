import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';

import { ACCESS_TOKEN, apiEndpoints, AUTH_USER, REFRESH_TOKEN } from '#/constants';
import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from '#/utils';
import env from '#env';

interface RefreshTokenResponse {
  access: string;
  refresh?: string;
}

const handleLogout = (error: unknown) => {
  removeLocalStorageItem(ACCESS_TOKEN);
  removeLocalStorageItem(REFRESH_TOKEN);
  removeLocalStorageItem(AUTH_USER);
  return Promise.reject(error);
};

export const handleUnauthorized = async (error: unknown, axiosInstance: AxiosInstance) => {
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
