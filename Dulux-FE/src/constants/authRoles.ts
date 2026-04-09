import { ROUTES } from './routes';

export const APP_USER_ROLES = {
  ADMIN: 'admin',
  CS: 'cs',
  QUALITY: 'quality',
} as const;

export type AppUserRole = (typeof APP_USER_ROLES)[keyof typeof APP_USER_ROLES];

const ROLE_BY_NORMALIZED_VALUE: Record<string, AppUserRole> = {
  admin: APP_USER_ROLES.ADMIN,
  cs: APP_USER_ROLES.CS,
  'cs agent': APP_USER_ROLES.CS,
  'customer service': APP_USER_ROLES.CS,
  quality: APP_USER_ROLES.QUALITY,
  'quality reviewer': APP_USER_ROLES.QUALITY,
};

export const ROLE_HOME_ROUTES: Record<AppUserRole, string> = {
  [APP_USER_ROLES.ADMIN]: ROUTES.DASHBOARD,
  [APP_USER_ROLES.CS]: ROUTES.DASHBOARD,
  [APP_USER_ROLES.QUALITY]: ROUTES.QUALITY,
};

export const normalizeAppUserRole = (role: string | undefined): AppUserRole | null => {
  if (!role) {
    return null;
  }

  const normalizedRole = role.replaceAll('_', ' ').toLowerCase().trim();

  return (
    ROLE_BY_NORMALIZED_VALUE[normalizedRole] ??
    (normalizedRole.includes('quality') ? APP_USER_ROLES.QUALITY : null) ??
    (normalizedRole.includes('admin') ? APP_USER_ROLES.ADMIN : null) ??
    (normalizedRole.includes('cs') ? APP_USER_ROLES.CS : null)
  );
};

export const getHomeRouteByRole = (role: string | undefined): string => {
  const normalizedRole = normalizeAppUserRole(role);

  if (!normalizedRole) {
    return ROUTES.DASHBOARD;
  }

  return ROLE_HOME_ROUTES[normalizedRole];
};
