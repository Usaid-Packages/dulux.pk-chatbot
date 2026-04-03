import type { DetailRouteConfig } from '#/types/routes.types';
import { ROUTES } from './routes';

export const DETAIL_ROUTE_CONFIGS: DetailRouteConfig[] = [
  { path: ROUTES.CLAIMS, indexTitle: 'Claims', detailTitle: 'Claim detail' },
  { path: ROUTES.COMPLAINTS, indexTitle: 'Live Chat', detailTitle: 'Chat thread' },
  { path: ROUTES.IMPORT, indexTitle: 'Import data', detailTitle: 'Import detail' },
  { path: ROUTES.SETTINGS, indexTitle: 'Settings', detailTitle: 'Settings detail' },
];
