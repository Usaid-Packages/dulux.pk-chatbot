import type { JSX } from 'react';

import { Navigate, Outlet } from 'react-router-dom';

import { getHomeRouteByRole, normalizeAppUserRole, ROUTES } from '#/constants';
import { useAuthContext } from '#/context';
import type { SidebarUserRole } from '#/types/layout.types';
import type { PrivateRouteProps } from '#/types/routes.types';

interface RoleRouteProps extends PrivateRouteProps {
  allowedRoles: SidebarUserRole[];
}

/**
 * RoleRoute protects routes by allowed role set.
 *
 * @param props - Children and allowed roles.
 * @returns Guarded route content.
 */
export const RoleRoute = ({ children, allowedRoles }: RoleRouteProps): JSX.Element => {
  const { token, user } = useAuthContext();

  if (!token) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  const normalizedRole = normalizeAppUserRole(user?.role);
  if (!normalizedRole || !allowedRoles.includes(normalizedRole)) {
    return <Navigate to={getHomeRouteByRole(user?.role)} replace />;
  }

  return children ?? <Outlet />;
};
