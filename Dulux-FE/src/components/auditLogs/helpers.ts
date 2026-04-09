import type { BadgeProps } from '#/components/ui/Badge';
import type { AuditLogAction } from '#/types/auditLogs';
import { formatDisplayDateTime } from '#/utils';

const AUDIT_ACTION_LABEL_MAP: Record<AuditLogAction, string> = {
  CREATE: 'Create',
  UPDATE: 'Update',
  DELETE: 'Delete',
};

const AUDIT_ACTION_BADGE_VARIANT_MAP: Record<AuditLogAction, BadgeProps['variant']> = {
  CREATE: 'approved',
  UPDATE: 'info',
  DELETE: 'rejected',
};

export const getAuditActionLabel = (action: AuditLogAction): string => {
  return AUDIT_ACTION_LABEL_MAP[action];
};

export const getAuditActionBadgeVariant = (action: AuditLogAction): BadgeProps['variant'] => {
  return AUDIT_ACTION_BADGE_VARIANT_MAP[action] ?? 'default';
};

export const formatAuditCreatedAt = (createdAt: string): string => {
  return formatDisplayDateTime(createdAt);
};
