import type { ReactNode } from 'react';

/** Placeholder list/detail routes driven from `DETAIL_ROUTE_CONFIGS`. */
export interface DetailRouteConfig {
  path: string;
  indexTitle: string;
  detailTitle: string;
}

export interface PrivateRouteProps {
  /** When omitted, renders nested `<Outlet />` for layout routes. */
  children?: ReactNode;
}
