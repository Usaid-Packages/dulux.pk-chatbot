import { Navigate, Outlet } from 'react-router-dom';

import { APP_USER_ROLES, ROUTES, getHomeRouteByRole, normalizeAppUserRole } from '#/constants';
import { useAuthContext } from '#/context';
import type { PrivateRouteProps } from '#/types/routes.types';

/**
 * AdminRoute protects nested routes for admin users only.
 *
 * @param props - Optional route child element.
 * @returns Admin-only route gate.
 */
export const AdminRoute = ({ children }: PrivateRouteProps): React.JSX.Element => {
  const { token, user } = useAuthContext();

  if (!token) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (normalizeAppUserRole(user?.role) !== APP_USER_ROLES.ADMIN) {
    return <Navigate to={getHomeRouteByRole(user?.role)} replace />;
  }

  return children ?? <Outlet />;
};
