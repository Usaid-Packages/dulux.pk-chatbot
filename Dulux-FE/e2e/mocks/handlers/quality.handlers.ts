import type { MockRouteDefinition } from '../routes';

const qualityQueue = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 301,
      claim_number: 'CLM-301',
      registration_number: 'REG-301',
      customer_name: 'Hina Tariq',
      issue_type: 'PEELING',
      state: 'QA_REVIEW',
      city: 'Karachi',
      forwarded_by: 'CS Team',
      forwarded_at: '2026-04-23T08:00:00Z',
      claim_date: '2026-04-23T07:00:00Z',
      created: '2026-04-23T07:00:00Z',
      modified: '2026-04-23T08:00:00Z',
    },
    {
      id: 302,
      claim_number: 'CLM-302',
      registration_number: 'REG-302',
      customer_name: 'Omer Saeed',
      issue_type: 'FADING',
      state: 'RESUBMIT',
      city: 'Lahore',
      forwarded_by: 'CS Team',
      forwarded_at: '2026-04-23T09:00:00Z',
      claim_date: '2026-04-23T08:30:00Z',
      created: '2026-04-23T08:30:00Z',
      modified: '2026-04-23T09:00:00Z',
    },
  ],
};

export const qualityHandlers: MockRouteDefinition[] = [
  {
    id: 'quality-queue',
    method: 'GET',
    url: /.*\/api\/v1\/warranty\/claims\/$/,
    handle: ({ request }) => {
      const state = request.url().includes('state=QA_REVIEW') ? 'QA_REVIEW' : request.url().includes('state=RESUBMIT') ? 'RESUBMIT' : null;

      if (state === null) {
        return {
          status: 200,
          body: qualityQueue,
        };
      }

      return {
        status: 200,
        body: {
          ...qualityQueue,
          results: qualityQueue.results.filter(item => item.state === state),
          count: qualityQueue.results.filter(item => item.state === state).length,
        },
      };
    },
  },
  {
    id: 'quality-card-counts',
    method: 'GET',
    url: /.*\/api\/v1\/warranty\/card-counts\/quality\/$/,
    handle: () => ({
      status: 200,
      body: {
        totalInQueue: 2,
        qaReview: 1,
        qaApproved: 0,
        qaRejected: 1,
      },
    }),
  },
];
