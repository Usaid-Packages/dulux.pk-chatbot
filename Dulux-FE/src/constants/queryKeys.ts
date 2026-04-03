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
  quality: {
    all: ['quality'] as const,
    list: (filters: Record<string, unknown>) => ['quality', 'list', filters] as const,
    detail: (id: string) => ['quality', 'detail', id] as const,
    approve: ['quality', 'approve'] as const,
    reject: ['quality', 'reject'] as const,
    requestInfo: ['quality', 'request-info'] as const,
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
  products: {
    all: ['products'] as const,
    list: (paramsKey: string): readonly ['products', 'list', string] => ['products', 'list', paramsKey] as const,
    detail: (id: string): readonly ['products', 'detail', string] => ['products', 'detail', id] as const,
    create: ['products', 'create'] as const,
    update: ['products', 'update'] as const,
    delete: ['products', 'delete'] as const,
  },
  surfaceTypes: {
    all: ['surface-types'] as const,
    list: (paramsKey: string): readonly ['surface-types', 'list', string] =>
      ['surface-types', 'list', paramsKey] as const,
    detail: (id: string): readonly ['surface-type', string] => ['surface-type', id] as const,
    create: ['surface-types', 'create'] as const,
    update: ['surface-types', 'update'] as const,
    delete: ['surface-types', 'delete'] as const,
  },
} as const;
