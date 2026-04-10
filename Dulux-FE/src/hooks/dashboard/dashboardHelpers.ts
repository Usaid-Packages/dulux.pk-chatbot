import { DASHBOARD_FLOW_CONFIGS } from '#/constants';
import { APP_USER_ROLES } from '#/constants/authRoles';
import type { AppUserRole } from '#/constants/authRoles';
import type { DashboardFlowCardModel, DashboardStatItem, DashboardSummaryResponse } from '#/types/dashboard.types';

const DRAFTS_STAT_LABEL = 'Drafts';

const isDashboardStatItem = (stat: DashboardStatItem | undefined): stat is DashboardStatItem => {
  return Boolean(stat?.label);
};

export const mapDashboardCards = (
  summary: DashboardSummaryResponse,
  role: AppUserRole | null
): DashboardFlowCardModel[] => {
  return DASHBOARD_FLOW_CONFIGS.filter(config => {
    if (role === APP_USER_ROLES.CS || role === APP_USER_ROLES.ADMIN) {
      return config.id !== 'qualityReview';
    }

    return true;
  }).map(config => {
    const liveStats = summary.flows[config.id] ?? config.defaultStats;
    const stats = [liveStats.primaryStat, liveStats.secondaryStat].filter(isDashboardStatItem);
    const visibleStats =
      config.id === 'manualRegistration' ? stats.filter(stat => stat.label !== DRAFTS_STAT_LABEL) : stats;
    const fallbackStats = [config.defaultStats.secondaryStat].filter(isDashboardStatItem);
    const resolvedStats = visibleStats.length > 0 ? visibleStats : fallbackStats;

    return {
      id: config.id,
      title: config.title,
      icon: config.icon,
      to: config.to,
      description: config.description,
      screens: liveStats.screens,
      stats: resolvedStats,
    };
  });
};
