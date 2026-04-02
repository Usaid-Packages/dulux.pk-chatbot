import { Navigate } from 'react-router-dom';

import { ROUTES } from '#/constants';
import { useAuthContext } from '#/context';
import type { PrivateRouteProps } from '#/types/routes.types';

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { token } = useAuthContext();

  if (token) return children;

  return <Navigate to={ROUTES.LOGIN} replace />;
}
