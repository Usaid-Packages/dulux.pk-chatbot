import { apiEndpoints, GET } from '#/constants';
import { dashboardAnalyticsSchema, dashboardSummarySchema } from '#/schemas/dashboardSchemas';
import type {
  DashboardAnalyticsModel,
  DashboardAnalyticsQuery,
  DashboardCardsQuery,
  DashboardSummaryResponse,
} from '#/types/dashboard.types';
import { performRequest } from './apiClient';

const DEFAULT_WINDOW_DAYS = 7;

export const getDashboardSummary = async (params?: DashboardCardsQuery): Promise<DashboardSummaryResponse> => {
  const response = await performRequest<unknown, undefined, { date_from?: string; date_to?: string }>({
    method: GET,
    url: apiEndpoints.dashboard.cards,
    params: {
      date_from: params?.dateFrom,
      date_to: params?.dateTo,
    },
  });

  return dashboardSummarySchema.parse(response);
};

export const getDashboardAnalytics = async (params?: DashboardAnalyticsQuery): Promise<DashboardAnalyticsModel> => {
  const response = await performRequest<unknown, undefined, { window_days: number }>({
    method: GET,
    url: apiEndpoints.dashboard.analytics,
    params: {
      window_days: params?.windowDays ?? DEFAULT_WINDOW_DAYS,
    },
  });

  return dashboardAnalyticsSchema.parse(response);
};
