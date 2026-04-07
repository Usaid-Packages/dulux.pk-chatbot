import type { DashboardAnalyticsModel } from '#/types/dashboard.types';

export const DASHBOARD_ANALYTICS_MOCK: DashboardAnalyticsModel = {
  trendSeries: [
    { day: 'Mon', registrations: 18, claims: 7 },
    { day: 'Tue', registrations: 22, claims: 9 },
    { day: 'Wed', registrations: 25, claims: 11 },
    { day: 'Thu', registrations: 21, claims: 10 },
    { day: 'Fri', registrations: 27, claims: 13 },
    { day: 'Sat', registrations: 16, claims: 8 },
    { day: 'Sun', registrations: 14, claims: 6 },
  ],
  workloadSeries: [
    { module: 'Registrations', pending: 42, inReview: 18, resolved: 65 },
    { module: 'Claims', pending: 29, inReview: 22, resolved: 31 },
    { module: 'Quality', pending: 14, inReview: 12, resolved: 19 },
    { module: 'Complaints', pending: 19, inReview: 10, resolved: 54 },
  ],
};
