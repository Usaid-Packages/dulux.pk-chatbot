import type { LucideIcon } from 'lucide-react';
import { Boxes, CheckCircle2, MessageSquareText, PenSquare, ShieldCheck, TriangleAlert } from 'lucide-react';

import type { DashboardFlowIcon } from '#/types/dashboard.types';

export const DASHBOARD_ICON_MAP: Record<DashboardFlowIcon, LucideIcon> = {
  check: CheckCircle2,
  edit: PenSquare,
  alert: TriangleAlert,
  inspect: ShieldCheck,
  chat: MessageSquareText,
  box: Boxes,
};
