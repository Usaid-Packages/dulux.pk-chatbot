import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '#/constants';
import { getDashboardAnalytics } from '#/services/dashboardService';
import type { DashboardAnalyticsModel, DashboardWindowDays } from '#/types/dashboard.types';

const DASHBOARD_STALE_TIME_MS = 1000 * 60 * 5;
const DEFAULT_WINDOW_DAYS: DashboardWindowDays = 7;

export const useDashboardAnalyticsQuery = (
  windowDays: DashboardWindowDays = DEFAULT_WINDOW_DAYS
): UseQueryResult<DashboardAnalyticsModel, Error> => {
  return useQuery<DashboardAnalyticsModel, Error>({
    queryKey: queryKeys.dashboard.analytics(windowDays),
    queryFn: () => getDashboardAnalytics({ windowDays }),
    staleTime: DASHBOARD_STALE_TIME_MS,
  });
};
