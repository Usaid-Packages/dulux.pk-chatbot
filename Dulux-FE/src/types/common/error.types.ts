export interface ApiError {
  message: string;
  statusCode?: number;
  details?: unknown;
}

export interface ApiErrorShape {
  response?: {
    data?: {
      message?: string;
      detail?: string;
    };
  };
  message?: string;
}
