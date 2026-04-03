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
} as const;
