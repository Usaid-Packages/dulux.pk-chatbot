import { DASHBOARD_FLOW_CONFIGS } from '#/constants';
import type { DashboardFlowCardModel, DashboardSummaryResponse } from '#/types/dashboard.types';

export const mapDashboardCards = (summary: DashboardSummaryResponse): DashboardFlowCardModel[] => {
  return DASHBOARD_FLOW_CONFIGS.map(config => {
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
