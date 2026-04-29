import type { MockRouteDefinition } from '../routes';

interface LoginPayload {
  email?: string;
  password?: string;
  refresh?: string;
}

const readPayload = (requestBody: string | null): LoginPayload => {
  if (!requestBody) {
    return {};
  }

  try {
    return JSON.parse(requestBody) as LoginPayload;
  } catch {
    return {};
  }
};

const toRole = (email: string): string => {
  const normalized = email.toLowerCase();

  if (normalized.includes('quality')) {
    return 'quality';
  }

  if (normalized.includes('admin')) {
    return 'admin';
  }

  return 'cs';
};

const toUserId = (role: string): number => {
  if (role === 'admin') {
    return 1;
  }

  if (role === 'quality') {
    return 3;
  }

  return 2;
};

export const authHandlers: MockRouteDefinition[] = [
  {
    id: 'auth-login',
    method: 'POST',
    url: /.*\/api\/v1\/users\/login\/$/,
    handle: ({ request }) => {
      const payload = readPayload(request.postData());
      const email = payload.email?.trim() ?? 'cs_user@dulux.pk';
      const role = toRole(email);

      return {
        status: 200,
        body: {
          access: `${role}-access-token`,
          refresh: `${role}-refresh-token`,
          user: {
            id: toUserId(role),
            email,
            role,
          },
        },
      };
    },
  },
  {
    id: 'auth-refresh',
    method: 'POST',
    url: /.*\/api\/v1\/users\/token\/refresh\/$/,
    handle: ({ request }) => {
      const payload = readPayload(request.postData());
      const refreshToken = payload.refresh ?? '';

      return {
        status: 200,
        body: {
          access: `refreshed-access-${refreshToken || 'token'}`,
          refresh: 'refreshed-refresh-token',
        },
      };
    },
  },
  {
    id: 'auth-verify',
    method: 'POST',
    url: /.*\/api\/v1\/users\/token\/verify\/$/,
    handle: () => ({
      status: 200,
      body: {
        detail: 'Token is valid.',
      },
    }),
  },
];
