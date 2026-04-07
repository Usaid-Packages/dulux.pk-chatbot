export type DashboardFlowId =
  | 'registrationApprovals'
  | 'manualRegistration'
  | 'claimsApprovals'
  | 'qualityReview'
  | 'liveChat'
  | 'productCatalog';

export type DashboardFlowIcon = 'check' | 'edit' | 'alert' | 'inspect' | 'chat' | 'box';

export interface DashboardStatItem {
  label: string;
  value: string | number;
}

export interface DashboardFlowStats {
  screens: number;
  primaryStat: DashboardStatItem;
  secondaryStat: DashboardStatItem;
}

export interface DashboardSummaryResponse {
  flows: Record<DashboardFlowId, DashboardFlowStats>;
}

export type DashboardWindowDays = 7 | 14 | 30;

export interface DashboardFlowConfig {
  id: DashboardFlowId;
  title: string;
  icon: DashboardFlowIcon;
  to: string;
  description: string;
  defaultStats: DashboardFlowStats;
}

export interface DashboardFlowCardModel {
  id: DashboardFlowId;
  title: string;
  icon: DashboardFlowIcon;
  to: string;
  description: string;
  screens: number;
  stats: [DashboardStatItem, DashboardStatItem];
}

export interface DashboardTrendPoint {
  day: string;
  registrations: number;
  claims: number;
}

export interface DashboardWorkloadPoint {
  module: string;
  pending: number;
  inReview: number;
  resolved: number;
}

export interface DashboardAnalyticsModel {
  trendSeries: DashboardTrendPoint[];
  workloadSeries: DashboardWorkloadPoint[];
}

export interface DashboardCardsQuery {
  dateFrom?: string;
  dateTo?: string;
}

export interface DashboardAnalyticsQuery {
  windowDays?: DashboardWindowDays;
}
