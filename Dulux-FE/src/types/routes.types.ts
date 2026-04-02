import type { ReactNode } from 'react';

export interface PrivateRouteProps {
  /** When omitted, renders nested `<Outlet />` for layout routes. */
  children?: ReactNode;
}
