export const queryKeys = {
  auth: {
    login: 'login',
    forgotPassword: 'forgot-password',
    resetPassword: 'reset-password',
    logout: 'logout',
  },
  claims: {
    all: ['claims'] as const,
    list: (filters: Record<string, unknown>) => ['claims', 'list', filters] as const,
    detail: (id: string) => ['claims', 'detail', id] as const,
    approve: ['claims', 'approve'] as const,
    sendToQuality: ['claims', 'send-to-quality'] as const,
    reject: ['claims', 'reject'] as const,
    requestInfo: ['claims', 'request-info'] as const,
  },
  dashboard: {
    summary: 'dashboard-summary',
  },
  registrations: {
    all: ['registrations'] as const,
    list: (paramsKey: string): readonly ['registrations', string] => ['registrations', paramsKey] as const,
    detail: (id: string): readonly ['registration', string] => ['registration', id] as const,
    manualCreate: ['registrations', 'manual-create'] as const,
  },
} as const;
