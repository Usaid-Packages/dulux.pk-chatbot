import axios from 'axios';
import type { AxiosError } from 'axios';
import * as caseConverter from 'change-object-case';

import { ACCESS_TOKEN, HTTP_STATUS_UNAUTHORIZED } from '#/constants';
import { getLocalStorageItem } from '#/utils';
import env from '#env';
import { handleUnauthorized } from './refreshTokenService';

const options = { recursive: true, arrayRecursive: true };

const axiosInstance = axios.create({
  baseURL: env.VITE_BACKEND_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

axiosInstance.interceptors.request.use(config => {
  const accessToken = getLocalStorageItem(ACCESS_TOKEN);
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;

  if (config.data instanceof FormData) {
    // Let the browser set multipart boundary automatically for file uploads.
    delete config.headers['Content-Type'];
  } else {
    const caseConvertedData = caseConverter.snakeKeys(config?.data, options);
    config.data = caseConvertedData;
  }

  const caseConvertedData = caseConverter.snakeKeys(config.params);
  config.params = caseConvertedData;

  return config;
});

axiosInstance.interceptors.response.use(
  response => {
    if (response.data && typeof response.data === 'object') {
      response.data = caseConverter.camelKeys(response.data, options);
    }
    return response;
  },
  async (error: AxiosError) => {
    const { response } = error;
    const status = response?.status ?? 0;
    const data = response?.data ?? {};

    if (status === HTTP_STATUS_UNAUTHORIZED) {
      return handleUnauthorized(error);
    }

    if (data && typeof data === 'object' && error.response) {
      error.response.data = caseConverter.camelKeys(data, options);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
