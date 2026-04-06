import value from '#env';

const NETWORK_ERROR_CODE = 'ERR_NETWORK';

export const shouldUseMockProducts = (): boolean => {
  const rawValue = value.VITE_USE_MOCK_PRODUCTS;
  return rawValue === undefined || String(rawValue).toLowerCase() === 'true';
};

export const isNetworkError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const typedError = error as { code?: string };
  return typedError.code === NETWORK_ERROR_CODE;
};
