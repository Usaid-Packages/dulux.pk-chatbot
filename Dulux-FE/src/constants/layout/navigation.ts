import type { AppNavigationItem, HeaderTitleMapItem, SidebarNavItem } from '#/types/layout.types';
import { ROUTES } from '../routes';

export const APP_NAVIGATION_ITEMS: AppNavigationItem[] = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, headerTitle: 'Dashboard' },
  { label: 'Registrations', path: ROUTES.REGISTRATIONS, headerTitle: 'Registrations' },
  { label: 'Claims', path: ROUTES.CLAIMS, headerTitle: 'Claims' },
  { label: 'Live Chat', path: ROUTES.COMPLAINTS, headerTitle: 'Live Chat' },
  { label: 'Quality Review', path: ROUTES.QUALITY, headerTitle: 'Quality Review' },
  { label: 'Product Catalog', path: ROUTES.PRODUCTS, headerTitle: 'Product Catalog' },
  { label: 'Import Data', path: ROUTES.IMPORT, headerTitle: 'Import Data' },
  { label: 'Settings', path: ROUTES.SETTINGS, headerTitle: 'Settings' },
];

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = APP_NAVIGATION_ITEMS.map(({ label, path }) => ({ label, path }));

export const HEADER_TITLE_MAP: HeaderTitleMapItem[] = [
  ...APP_NAVIGATION_ITEMS.map(({ path, headerTitle }) => ({ pathPrefix: path, title: headerTitle })),
  { pathPrefix: ROUTES.MANUAL_REGISTRATION_ROOT, title: 'Manual Registration' },
] as const;
