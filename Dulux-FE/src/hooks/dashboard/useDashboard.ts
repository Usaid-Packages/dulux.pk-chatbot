import { DASHBOARD_ANALYTICS_MOCK, DASHBOARD_SUMMARY_FALLBACK } from '#/constants';
import { useDashboardSummaryQuery } from '#/data-layer/dashboard';
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

export const useDashboard = (): UseDashboardResult => {
  const { data, isLoading, isError, isRefetching, error, refetch } = useDashboardSummaryQuery();

  const summary = data ?? DASHBOARD_SUMMARY_FALLBACK;
  const flowCards = mapDashboardCards(summary);
  const errorMessage = isError ? getApiErrorMessage(error) : '';

  const refetchDashboard = (): void => {
    void refetch();
  };

  return {
    flowCards,
    analytics: DASHBOARD_ANALYTICS_MOCK,
    isLoading,
    isError,
    isRefetching,
    errorMessage,
    refetchDashboard,
  };
};
