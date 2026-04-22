import { Navigate, Outlet } from 'react-router-dom';

import { ROUTES } from '#/constants';
import { useAuthContext } from '#/context';
import type { PrivateRouteProps } from '#/types/routes.types';

export function PrivateRoute({ children }: PrivateRouteProps): JSX.Element {
  const { token } = useAuthContext();

  if (!token) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return children ?? <Outlet />;
}
