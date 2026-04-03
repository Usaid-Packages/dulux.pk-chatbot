import value from '#env';

const NETWORK_ERROR_CODE = 'ERR_NETWORK';

export const shouldUseMockClaims = (): boolean => {
  const rawValue = value.VITE_CLAIMS_MOCK_ENABLED;
  return rawValue === undefined || String(rawValue).toLowerCase() === 'true';
};

export const isNetworkError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const typedError = error as { code?: string };
  return typedError.code === NETWORK_ERROR_CODE;
};
