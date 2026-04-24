import type { MockRouteDefinition } from '../routes';

export const auditLogsHandlers: MockRouteDefinition[] = [
  {
    id: 'audit-logs-timeline',
    method: 'GET',
    url: /.*\/api\/v1\/audit-logs\/timeline\/?(?:\?.*)?$/,
    handle: ({ request }) => {
      const searchParams = new URL(request.url()).searchParams;
      const objectId = searchParams.get('object_id') ?? '0';

      return {
        status: 200,
        body: {
          results: [
            {
              id: 1,
              user: 'Admin User',
              actor_email: 'admin.e2e.mock@dulux.local',
              action: 'UPDATE',
              event_type: 'Claim moved to IN_REVIEW',
              performed_at: '2026-04-23T10:00:00Z',
              updated_fields: ['state'],
              registration_number: `REG-${objectId}`,
              changes: {
                state: {
                  before: 'SUBMITTED',
                  after: 'IN_REVIEW',
                },
              },
            },
          ],
        },
      };
    },
  },
];
