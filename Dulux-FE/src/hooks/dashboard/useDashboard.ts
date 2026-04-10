import { normalizeAppUserRole } from '#/constants';
import { useAuthContext } from '#/context';
import { useDashboardAnalyticsQuery, useDashboardSummaryQuery } from '#/data-layer/dashboard';
import type { DashboardAnalyticsModel, DashboardFlowCardModel } from '#/types/dashboard.types';
import { getApiErrorMessage } from '#/utils';
import { mapDashboardCards } from './dashboardHelpers';

interface UseDashboardResult {
  flowCards: DashboardFlowCardModel[];
  analytics: DashboardAnalyticsModel;
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  errorMessage: string;
  refetchDashboard: () => void;
}

const EMPTY_ANALYTICS: DashboardAnalyticsModel = {
  trendSeries: [],
  workloadSeries: [],
};

export const useDashboard = (): UseDashboardResult => {
  const { user } = useAuthContext();
  const summaryQuery = useDashboardSummaryQuery();
  const analyticsQuery = useDashboardAnalyticsQuery();
  const normalizedRole = normalizeAppUserRole(user?.role);

  const flowCards = summaryQuery.data ? mapDashboardCards(summaryQuery.data, normalizedRole) : [];
  const analytics = analyticsQuery.data ?? EMPTY_ANALYTICS;
  const combinedError = summaryQuery.error ?? analyticsQuery.error;
  const isError = summaryQuery.isError || analyticsQuery.isError;
  const isLoading = summaryQuery.isLoading || analyticsQuery.isLoading;
  const isRefetching = summaryQuery.isRefetching || analyticsQuery.isRefetching;
  const errorMessage = combinedError ? getApiErrorMessage(combinedError) : '';

  const refetchDashboard = (): void => {
    void summaryQuery.refetch();
    void analyticsQuery.refetch();
  };

  return {
    flowCards,
    analytics,
    isLoading,
    isError,
    isRefetching,
    errorMessage,
    refetchDashboard,
  };
};
