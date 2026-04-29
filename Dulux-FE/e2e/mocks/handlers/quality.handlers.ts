import type { MockRouteDefinition } from '../routes';

export const qualityHandlers: MockRouteDefinition[] = [
  {
    id: 'quality-card-counts',
    method: 'GET',
    url: /.*\/api\/v1\/warranty\/card-counts\/quality\/?(?:\?.*)?$/,
    handle: () => ({
      status: 200,
      body: {
        totalInQueue: 3,
        qaReview: 1,
        qaApproved: 1,
        qaRejected: 1,
      },
    }),
  },
];
