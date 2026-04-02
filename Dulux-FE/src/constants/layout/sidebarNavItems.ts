import type { SidebarNavItem } from '#/types/layout.types';
import { ROUTES } from '../routes';

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { label: 'Dashboard', path: ROUTES.APP.DASHBOARD },
  { label: 'Registrations', path: ROUTES.APP.REGISTRATIONS },
  { label: 'Claims', path: ROUTES.APP.CLAIMS },
  { label: 'Live Chat', path: ROUTES.APP.COMPLAINTS },
  { label: 'Quality Review', path: ROUTES.APP.QUALITY },
  { label: 'Product Catalog', path: ROUTES.APP.PRODUCTS },
  { label: 'Import Data', path: ROUTES.APP.IMPORT },
  { label: 'Settings', path: ROUTES.APP.SETTINGS },
];
