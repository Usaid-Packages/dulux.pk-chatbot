import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '#/constants';
import { getDashboardSummary } from '#/services/dashboardService';
import type { DashboardSummaryResponse } from '#/types/dashboard.types';

const DASHBOARD_STALE_TIME_MS = 1000 * 60 * 5;

export const useDashboardSummaryQuery = (): UseQueryResult<DashboardSummaryResponse, Error> => {
  return useQuery<DashboardSummaryResponse, Error>({
    queryKey: queryKeys.dashboard.summary,
    queryFn: getDashboardSummary,
    staleTime: DASHBOARD_STALE_TIME_MS,
  });
};
