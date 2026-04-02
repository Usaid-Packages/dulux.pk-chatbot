export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface LoginPayload extends Record<string, unknown> {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload extends Record<string, unknown> {
  email: string;
}

export interface LogoutPayload extends Record<string, unknown> {
  refreshToken: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface LogoutResponse {
  message: string;
}
