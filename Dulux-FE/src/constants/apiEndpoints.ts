const API_USERS_V1 = '/api/v1/users';
const API_CORE_V1 = '/api/v1/core';
const API_DASHBOARD_V1 = '/dashboard/api/v1';
const API_WARRANTY_V1 = '/api/v1/warranty';
const API_PRODUCTS_V1 = '/api/v1/products';
const API_COMPLAINTS_V1 = '/complaints';

export const apiEndpoints = {
  auth: {
    login: `${API_USERS_V1}/login/`,
    refresh: `${API_USERS_V1}/token/refresh/`,
    verify: `${API_USERS_V1}/token/verify/`,
    forgotPassword: `${API_USERS_V1}/password/reset/`,
    resetPassword: `${API_USERS_V1}/password/reset/confirm/`,
  },
  core: {
    uploadImage: `${API_CORE_V1}/upload-image/`,
  },
  claims: {
    list: `${API_WARRANTY_V1}/claims/`,
    create: `${API_WARRANTY_V1}/claims/`,
    detail: (id: string): string => `${API_WARRANTY_V1}/claims/${id}/`,
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
    createManual: `${API_WARRANTY_V1}/registrations/`,
    detail: (id: string | number): string => `${API_WARRANTY_V1}/registrations/${id}/`,
  },
  products: {
    list: `${API_PRODUCTS_V1}/`,
    detail: (id: string | number): string => `${API_PRODUCTS_V1}/${id}/`,
    surfaceTypes: `${API_PRODUCTS_V1}/surface-types/`,
    surfaceTypeDetail: (id: string | number): string => `${API_PRODUCTS_V1}/surface-types/${id}/`,
  },
  complaints: {
    list: `${API_COMPLAINTS_V1}/`,
    detail: (id: string): string => `${API_COMPLAINTS_V1}/${id}/`,
    sendMessage: (id: string): string => `${API_COMPLAINTS_V1}/${id}/messages/`,
    markRead: (id: string): string => `${API_COMPLAINTS_V1}/${id}/mark-read/`,
    resolve: (id: string): string => `${API_COMPLAINTS_V1}/${id}/resolve/`,
    transfer: (id: string): string => `${API_COMPLAINTS_V1}/${id}/transfer/`,
    escalate: (id: string): string => `${API_COMPLAINTS_V1}/${id}/escalate/`,
  },
} as const;
