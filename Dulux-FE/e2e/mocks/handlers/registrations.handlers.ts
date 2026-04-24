import type { MockRouteDefinition } from '../routes';

const registrationList = {
  count: 3,
  next: null,
  previous: null,
  results: [
    {
      id: 101,
      registrationCode: 'REG-101',
      customerName: 'Ali Khan',
      city: 'Karachi',
      state: 'SUBMITTED',
      source: 'MANUAL',
      created: '2026-04-20T08:00:00Z',
      modified: '2026-04-20T08:00:00Z',
    },
    {
      id: 102,
      registrationCode: 'REG-102',
      customerName: 'Sara Ali',
      city: 'Lahore',
      state: 'APPROVED',
      source: 'CS',
      created: '2026-04-20T09:00:00Z',
      modified: '2026-04-20T10:00:00Z',
    },
    {
      id: 103,
      registrationCode: 'REG-103',
      customerName: 'Imran Shah',
      city: 'Islamabad',
      state: 'RESUBMIT',
      source: 'CS',
      created: '2026-04-20T11:00:00Z',
      modified: '2026-04-20T11:30:00Z',
    },
  ],
};

export const registrationsHandlers: MockRouteDefinition[] = [
  {
    id: 'registrations-list',
    method: 'GET',
    url: /.*\/api\/v1\/warranty\/registrations\/$/,
    handle: () => ({
      status: 200,
      body: registrationList,
    }),
  },
  {
    id: 'registrations-card-counts',
    method: 'GET',
    url: /.*\/api\/v1\/warranty\/card-counts\/registrations\/$/,
    handle: () => ({
      status: 200,
      body: {
        total: 3,
        submitted: 1,
        approved: 1,
        resubmit: 1,
      },
    }),
  },
];
