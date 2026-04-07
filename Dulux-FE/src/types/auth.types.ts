export interface AuthUser {
  id: number;
  email: string;
  role: string;
}

export interface LoginPayload extends Record<string, unknown> {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload extends Record<string, unknown> {
  email: string;
}

export interface ResetPasswordPayload extends Record<string, unknown> {
  uid?: string;
  token?: string;
  password: string;
  confirmPassword: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LoginApiUser {
  id: number;
  email: string;
  role: string;
}

export interface LoginApiResponse {
  access: string;
  refresh: string;
  user: LoginApiUser;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}
