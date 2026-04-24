import type { MockRouteDefinition } from '../routes';

export const complaintsHandlers: MockRouteDefinition[] = [
  {
    id: 'complaints-list',
    method: 'GET',
    url: /.*\/api\/v1\/complaints\/$/,
    handle: () => ({
      status: 200,
      body: {
        count: 2,
        next: null,
        previous: null,
        results: [
          {
            id: 'cmp-1',
            ticketId: 'CMP-001',
            customerName: 'Ayesha',
            status: 'OPEN',
            modified: '2026-04-23T08:00:00Z',
          },
          {
            id: 'cmp-2',
            ticketId: 'CMP-002',
            customerName: 'Bilal',
            status: 'IN_PROGRESS',
            modified: '2026-04-23T08:30:00Z',
          },
        ],
      },
    }),
  },
  {
    id: 'complaints-card-counts',
    method: 'GET',
    url: /.*\/api\/v1\/complaints\/card-counts\/live-chat\/$/,
    handle: () => ({
      status: 200,
      body: {
        totalThreads: 2,
        open: 1,
        inProgress: 1,
        resolved: 0,
      },
    }),
  },
];
