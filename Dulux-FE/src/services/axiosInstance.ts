import axios from 'axios';
import type { AxiosError } from 'axios';
import * as caseConverter from 'change-object-case';

import { ACCESS_TOKEN, HTTP_STATUS_UNAUTHORIZED } from '#/constants';
import { getLocalStorageItem } from '#/utils';
import env from '#env';
import { handleUnauthorized } from './refreshTokenService';

const options = { recursive: true, arrayRecursive: true };

interface CaseTransformConfigFlags {
  skipRequestCaseTransform?: boolean;
  skipResponseCaseTransform?: boolean;
}

const axiosInstance = axios.create({
  baseURL: env.VITE_BACKEND_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

axiosInstance.interceptors.request.use(config => {
  const { skipRequestCaseTransform = false } = config as typeof config & CaseTransformConfigFlags;
  const accessToken = getLocalStorageItem(ACCESS_TOKEN);
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;

  if (config.data instanceof FormData) {
    // Let the browser set multipart boundary automatically for file uploads.
    delete config.headers['Content-Type'];
  } else if (!skipRequestCaseTransform && config.data && typeof config.data === 'object') {
    const caseConvertedData = caseConverter.snakeKeys(config?.data, options);
    config.data = caseConvertedData;
  }

  if (!skipRequestCaseTransform && config.params && typeof config.params === 'object') {
    const caseConvertedParams = caseConverter.snakeKeys(config.params, options);
    config.params = caseConvertedParams;
  }

  return config;
});

axiosInstance.interceptors.response.use(
  response => {
    const { skipResponseCaseTransform = false } = response.config as typeof response.config & CaseTransformConfigFlags;

    if (!skipResponseCaseTransform && response.data && typeof response.data === 'object') {
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

    const typedError = error as AxiosError & { config?: CaseTransformConfigFlags };
    const shouldSkipResponseCaseTransform = typedError.config?.skipResponseCaseTransform ?? false;

    if (!shouldSkipResponseCaseTransform && data && typeof data === 'object' && error.response) {
      error.response.data = caseConverter.camelKeys(data, options);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
