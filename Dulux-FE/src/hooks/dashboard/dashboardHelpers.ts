import { DASHBOARD_FLOW_CONFIGS } from '#/constants';
import { APP_USER_ROLES } from '#/constants/authRoles';
import type { AppUserRole } from '#/constants/authRoles';
import type { DashboardFlowCardModel, DashboardSummaryResponse } from '#/types/dashboard.types';

export const mapDashboardCards = (
  summary: DashboardSummaryResponse,
  role: AppUserRole | null
): DashboardFlowCardModel[] => {
  return DASHBOARD_FLOW_CONFIGS.filter(config => {
    if (role === APP_USER_ROLES.CS) {
      return config.id !== 'qualityReview';
    }

    return true;
  }).map(config => {
    const liveStats = summary.flows[config.id] ?? config.defaultStats;

    return {
      id: config.id,
      title: config.title,
      icon: config.icon,
      to: config.to,
      description: config.description,
      screens: liveStats.screens,
      stats: [liveStats.primaryStat, liveStats.secondaryStat],
    };
  });
};
