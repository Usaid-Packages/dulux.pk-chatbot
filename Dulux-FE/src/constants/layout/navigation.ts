import type { AppNavigationItem, HeaderTitleMapItem, SidebarNavItem } from '#/types/layout.types';
import { ROUTES } from '../routes';

export const APP_NAVIGATION_ITEMS: AppNavigationItem[] = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, headerTitle: 'Dashboard' },
  { label: 'Registrations', path: ROUTES.REGISTRATIONS, headerTitle: 'Registrations' },
  { label: 'Manual Registration', path: ROUTES.MANUAL_REGISTRATION_STEP_1, headerTitle: 'Manual Registration' },
  { label: 'Claims', path: ROUTES.CLAIMS, headerTitle: 'Claims' },
  { label: 'Live Chat', path: ROUTES.COMPLAINTS, headerTitle: 'Live Chat' },
  { label: 'Quality Review', path: ROUTES.QUALITY, headerTitle: 'Quality Review' },
  { label: 'Product Catalog', path: ROUTES.PRODUCTS, headerTitle: 'Product Catalog' },
  { label: 'Import Data', path: ROUTES.IMPORT, headerTitle: 'Import Data' },
  { label: 'Settings', path: ROUTES.SETTINGS, headerTitle: 'Settings' },
];

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { icon: 'LayoutDashboard', label: 'Dashboard', path: ROUTES.DASHBOARD, group: 'Main' },
  { icon: 'ClipboardList', label: 'Registrations', path: ROUTES.REGISTRATIONS, group: 'Warranty', badgeCount: 12 },
  { icon: 'FileUp', label: 'Manual Registration', path: ROUTES.MANUAL_REGISTRATION_STEP_1, group: 'Warranty' },
  { icon: 'ShieldCheck', label: 'Claims', path: ROUTES.CLAIMS, group: 'Warranty', badgeCount: 5 },
  { icon: 'FlaskConical', label: 'Quality Review', path: ROUTES.QUALITY, group: 'Warranty' },
  { icon: 'MessageSquareText', label: 'Live Chat', path: ROUTES.COMPLAINTS, group: 'Support', badgeCount: 3 },
  { icon: 'Boxes', label: 'Product Catalog', path: ROUTES.PRODUCTS, group: 'Admin' },
];

export const HEADER_TITLE_MAP: HeaderTitleMapItem[] = [
  ...APP_NAVIGATION_ITEMS.map(({ path, headerTitle }) => ({ pathPrefix: path, title: headerTitle })),
  { pathPrefix: ROUTES.MANUAL_REGISTRATION_ROOT, title: 'Manual Registration' },
] as const;
