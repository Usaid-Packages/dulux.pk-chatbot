import type { MockRouteDefinition } from '../routes';

export const coreHandlers: MockRouteDefinition[] = [
  {
    id: 'core-upload-image',
    method: 'POST',
    url: /.*\/api\/v1\/core\/upload-image\/?(?:\?.*)?$/,
    handle: () => ({
      status: 201,
      body: {
        id: 90001,
        image: 'https://picsum.photos/seed/upload/1200/800',
        url: 'https://picsum.photos/seed/upload/1200/800',
      },
    }),
  },
];
