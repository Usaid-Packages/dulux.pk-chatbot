/* eslint import/order: off */
import { apiEndpoints, GET } from '#/constants';
import { DASHBOARD_SUMMARY_FALLBACK } from '#/constants/dashboardFlowConfigs';
import { dashboardSummarySchema } from '#/schemas/dashboardSchemas';
import type { DashboardSummaryResponse } from '#/types/dashboard.types';
import value from '#env';

import { performRequest } from './apiClient';

const NETWORK_ERROR_CODE = 'ERR_NETWORK';

const shouldUseMockDashboard = (): boolean => {
  const rawValue = value.VITE_DASHBOARD_MOCK_ENABLED;
  return rawValue === undefined || String(rawValue).toLowerCase() === 'true';
};

const isNetworkError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const typedError = error as { code?: string };
  return typedError.code === NETWORK_ERROR_CODE;
};

const validateDashboardSummary = (response: unknown): DashboardSummaryResponse => {
  return dashboardSummarySchema.parse(response);
};

export const getDashboardSummary = async (): Promise<DashboardSummaryResponse> => {
  try {
    const response = await performRequest<unknown>({
      method: GET,
      url: apiEndpoints.dashboard.summary,
    });

    return validateDashboardSummary(response);
  } catch (error) {
    if (shouldUseMockDashboard() && isNetworkError(error)) {
      return DASHBOARD_SUMMARY_FALLBACK;
    }

    throw error;
  }
};
