const API_USERS_V1 = '/users/api/v1/auth';

export const apiEndpoints = {
  auth: {
    login: `${API_USERS_V1}/login/`,
    forgotPassword: `${API_USERS_V1}/forgot-password/`,
    logout: `${API_USERS_V1}/logout/`,
  },
} as const;
