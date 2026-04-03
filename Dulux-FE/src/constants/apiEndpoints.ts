const API_USERS_V1 = '/users/api/v1/auth';
const API_CLAIMS_V1 = '/claims';
const API_DASHBOARD_V1 = '/dashboard/api/v1';
const API_WARRANTY_V1 = '/api/v1/warranty';

export const apiEndpoints = {
  auth: {
    login: `${API_USERS_V1}/login/`,
    refresh: `${API_USERS_V1}/refresh/`,
    forgotPassword: `${API_USERS_V1}/forgot-password/`,
    resetPassword: `${API_USERS_V1}/reset-password/`,
    logout: `${API_USERS_V1}/logout/`,
  },
  claims: {
    list: `${API_CLAIMS_V1}/`,
    detail: (id: string): string => `${API_CLAIMS_V1}/${id}/`,
    approve: (id: string): string => `${API_CLAIMS_V1}/${id}/approve/`,
    sendToQuality: (id: string): string => `${API_CLAIMS_V1}/${id}/send-to-quality/`,
    reject: (id: string): string => `${API_CLAIMS_V1}/${id}/reject/`,
    requestInfo: (id: string): string => `${API_CLAIMS_V1}/${id}/request-info/`,
  },
  quality: {
    list: '/quality/',
    detail: (id: string): string => `/quality/${id}/`,
    approve: (id: string): string => `/quality/${id}/approve/`,
    reject: (id: string): string => `/quality/${id}/reject/`,
    requestInfo: (id: string): string => `/quality/${id}/request-info/`,
  },
  dashboard: {
    summary: `${API_DASHBOARD_V1}/summary/`,
  },
  registrations: {
    list: `${API_WARRANTY_V1}/registrations/`,
    detail: (id: string | number): string => `${API_WARRANTY_V1}/registrations/${id}/`,
  },
} as const;
