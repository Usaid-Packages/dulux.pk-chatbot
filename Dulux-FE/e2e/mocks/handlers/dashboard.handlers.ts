import type { MockRouteDefinition } from '../routes';

const dashboardSummary = {
  flows: {
    registrationApprovals: {
      screens: 4,
      primaryStat: { label: 'Pending', value: 12 },
      secondaryStat: { label: 'Approved Today', value: 4 },
    },
    manualRegistration: {
      screens: 6,
      primaryStat: { label: 'In Progress', value: 3 },
      secondaryStat: { label: 'Submitted Today', value: 2 },
    },
    claimsApprovals: {
      screens: 5,
      primaryStat: { label: 'Pending CS Review', value: 8 },
      secondaryStat: { label: 'Forwarded', value: 2 },
    },
    qualityReview: {
      screens: 5,
      primaryStat: { label: 'Awaiting Review', value: 5 },
      secondaryStat: { label: 'Resolved Today', value: 1 },
    },
    liveChat: {
      screens: 6,
      primaryStat: { label: 'Unassigned', value: 6 },
      secondaryStat: { label: 'Active', value: 3 },
    },
    productCatalog: {
      screens: 5,
      primaryStat: { label: 'Products', value: 16 },
      secondaryStat: { label: 'Surface Types', value: 7 },
    },
  },
};

const dashboardAnalytics = {
  trendSeries: [
    { day: 'Mon', registrations: 3, claims: 1 },
    { day: 'Tue', registrations: 2, claims: 2 },
    { day: 'Wed', registrations: 4, claims: 1 },
    { day: 'Thu', registrations: 1, claims: 3 },
    { day: 'Fri', registrations: 5, claims: 2 },
  ],
  workloadSeries: [
    { module: 'Registrations', pending: 5, inReview: 2, resolved: 9 },
    { module: 'Claims', pending: 4, inReview: 3, resolved: 5 },
    { module: 'Quality', pending: 2, inReview: 4, resolved: 1 },
  ],
};

export const dashboardHandlers: MockRouteDefinition[] = [
  {
    id: 'dashboard-cards',
    method: 'GET',
    url: /.*\/api\/v1\/users\/cards\/?(?:\?.*)?$/,
    handle: () => ({
      status: 200,
      body: dashboardSummary,
    }),
  },
  {
    id: 'dashboard-analytics',
    method: 'GET',
    url: /.*\/api\/v1\/users\/analytics\/?(?:\?.*)?$/,
    handle: () => ({
      status: 200,
      body: dashboardAnalytics,
    }),
  },
];
