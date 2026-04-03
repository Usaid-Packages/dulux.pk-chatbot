export const queryKeys = {
  auth: {
    login: 'login',
    forgotPassword: 'forgot-password',
    resetPassword: 'reset-password',
    logout: 'logout',
  },
  dashboard: {
    summary: 'dashboard-summary',
  },
  registrations: {
    all: ['registrations'] as const,
    list: (paramsKey: string): readonly ['registrations', string] => ['registrations', paramsKey] as const,
    detail: (id: string): readonly ['registration', string] => ['registration', id] as const,
  },
} as const;
