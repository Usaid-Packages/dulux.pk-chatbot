import type { HeaderTitleMapItem } from '#/types/layout.types';
import { ROUTES } from '../routes';

export const HEADER_TITLE_MAP: HeaderTitleMapItem[] = [
  { pathPrefix: ROUTES.APP.DASHBOARD, title: 'Dashboard' },
  { pathPrefix: ROUTES.APP.REGISTRATIONS, title: 'Registrations' },
  { pathPrefix: ROUTES.APP.CLAIMS, title: 'Claims' },
  { pathPrefix: ROUTES.APP.COMPLAINTS, title: 'Live Chat' },
  { pathPrefix: ROUTES.APP.QUALITY, title: 'Quality Review' },
  { pathPrefix: ROUTES.APP.PRODUCTS, title: 'Product Catalog' },
  { pathPrefix: ROUTES.APP.IMPORT, title: 'Import Data' },
  { pathPrefix: ROUTES.APP.SETTINGS, title: 'Settings' },
  { pathPrefix: ROUTES.APP.MANUAL_REGISTRATION.ROOT, title: 'Manual Registration' },
] as const;
