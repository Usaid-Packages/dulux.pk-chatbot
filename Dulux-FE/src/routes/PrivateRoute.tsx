import { Navigate } from 'react-router-dom';

import { ROUTES } from '#/constants';
import { useAuth } from '#/context';
import type { PrivateRouteProps } from '#/types/routes.types';

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { token } = useAuth();

  if (token) return children;

  return <Navigate to={ROUTES.UN_AUTHORIZED} replace />;
}
