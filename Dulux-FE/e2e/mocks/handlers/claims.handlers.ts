import type { MockRouteDefinition } from '../routes';

const claimsList = {
  count: 3,
  next: null,
  previous: null,
  results: [
    {
      id: 201,
      claim_number: 'CLM-201',
      registration_number: 'REG-101',
      customer_name: 'Ali Khan',
      city: 'Karachi',
      issue_type: 'PEELING',
      state: 'SUBMITTED',
      created: '2026-04-21T10:00:00Z',
      modified: '2026-04-21T10:00:00Z',
    },
    {
      id: 202,
      claim_number: 'CLM-202',
      registration_number: 'REG-102',
      customer_name: 'Sara Ali',
      city: 'Lahore',
      issue_type: 'FADING',
      state: 'IN_REVIEW',
      created: '2026-04-21T11:00:00Z',
      modified: '2026-04-21T12:00:00Z',
    },
    {
      id: 203,
      claim_number: 'CLM-203',
      registration_number: 'REG-103',
      customer_name: 'Imran Shah',
      city: 'Islamabad',
      issue_type: 'CRACKING',
      state: 'QA_REVIEW',
      created: '2026-04-21T12:30:00Z',
      modified: '2026-04-21T13:00:00Z',
    },
  ],
};

export const claimsHandlers: MockRouteDefinition[] = [
  {
    id: 'claims-list',
    method: 'GET',
    url: /.*\/api\/v1\/warranty\/claims\/$/,
    handle: () => ({
      status: 200,
      body: claimsList,
    }),
  },
  {
    id: 'claims-card-counts',
    method: 'GET',
    url: /.*\/api\/v1\/warranty\/card-counts\/claims\/$/,
    handle: () => ({
      status: 200,
      body: {
        submitted: 1,
        inReview: 1,
        qaReview: 1,
        approved: 0,
        rejected: 0,
      },
    }),
  },
];
