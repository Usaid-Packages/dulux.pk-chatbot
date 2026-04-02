const MANUAL_REGISTRATION_ROOT = '/manual-registration';

export const ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  UNAUTHORIZED: '/unauthorized',

  APP: {
    ROOT: '',
    DASHBOARD: '/dashboard',
    REGISTRATIONS: '/registrations',
    REGISTRATION_DETAIL: (id: string): string => `/registrations/${id}`,
    CLAIMS: '/claims',
    CLAIM_DETAIL: (id: string): string => `/claims/${id}`,
    QUALITY: '/quality',
    QUALITY_DETAIL: (id: string): string => `/quality/${id}`,
    COMPLAINTS: '/complaints',
    COMPLAINT_THREAD: (id: string): string => `/complaints/${id}`,
    PRODUCTS: '/products',
    PRODUCT_NEW: '/products/new',
    PRODUCT_EDIT: (id: string): string => `/products/${id}/edit`,
    IMPORT: '/import',
    SETTINGS: '/settings',
    MANUAL_REGISTRATION: {
      ROOT: '/manual-registration',
      STEP_1: `${MANUAL_REGISTRATION_ROOT}/step/1`,
      STEP: (stepId: number | string): string => `${MANUAL_REGISTRATION_ROOT}/step/${stepId}`,
      SUCCESS: `${MANUAL_REGISTRATION_ROOT}/success`,
    },
  },
} as const;
