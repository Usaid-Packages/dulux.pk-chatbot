import type { DashboardFlowConfig, DashboardSummaryResponse } from '#/types/dashboard.types';
import { ROUTES } from './routes';

export const DASHBOARD_FLOW_CONFIGS: DashboardFlowConfig[] = [
  {
    id: 'registrationApprovals',
    title: 'Registration Approvals',
    icon: 'check',
    to: ROUTES.REGISTRATIONS,
    description: 'List, detail, resubmission & rejection modals',
    defaultStats: {
      screens: 4,
      primaryStat: { label: 'Pending', value: 42 },
      secondaryStat: { label: 'Approved Today', value: 18 },
    },
  },
  {
    id: 'manualRegistration',
    title: 'Manual Registration',
    icon: 'edit',
    to: ROUTES.MANUAL_REGISTRATION_STEP_1,
    description: '5-step form wizard with review & success states',
    defaultStats: {
      screens: 6,
      primaryStat: { label: 'Drafts', value: 7 },
      secondaryStat: { label: 'Submitted Today', value: 5 },
    },
  },
  {
    id: 'claimsApprovals',
    title: 'Claims Approvals',
    icon: 'alert',
    to: ROUTES.CLAIMS,
    description: 'List, detail, forward, reject & request info modals',
    defaultStats: {
      screens: 5,
      primaryStat: { label: 'Pending CS Review', value: 21 },
      secondaryStat: { label: 'Forwarded', value: 9 },
    },
  },
  {
    id: 'qualityReview',
    title: 'Quality Review',
    icon: 'inspect',
    to: ROUTES.QUALITY,
    description: 'Technical review, approve, reject & request info modals',
    defaultStats: {
      screens: 5,
      primaryStat: { label: 'Awaiting Review', value: 14 },
      secondaryStat: { label: 'Resolved Today', value: 6 },
    },
  },
  {
    id: 'liveChat',
    title: 'Live Chat',
    icon: 'chat',
    to: ROUTES.COMPLAINTS,
    description: '3-panel chat with resolve, transfer & escalate modals',
    defaultStats: {
      screens: 6,
      primaryStat: { label: 'Unassigned', value: 12 },
      secondaryStat: { label: 'Active', value: 19 },
    },
  },
  {
    id: 'productCatalog',
    title: 'Product Catalog',
    icon: 'box',
    to: ROUTES.PRODUCTS,
    description: 'Products, surfaces, add/edit forms & delete modal',
    defaultStats: {
      screens: 5,
      primaryStat: { label: 'Products', value: 24 },
      secondaryStat: { label: 'Surface Types', value: 8 },
    },
  },
];

const createFallbackFlowStats = (): DashboardSummaryResponse['flows'] => {
  const flowStats = {} as DashboardSummaryResponse['flows'];

  DASHBOARD_FLOW_CONFIGS.forEach(config => {
    flowStats[config.id] = config.defaultStats;
  });

  return flowStats;
};

export const DASHBOARD_SUMMARY_FALLBACK: DashboardSummaryResponse = {
  flows: createFallbackFlowStats(),
};
