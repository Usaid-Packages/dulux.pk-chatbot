import type { BadgeProps } from '#/components/ui/Badge';
import type { ClaimStatus } from '#/types/claims.types';
import { formatDisplayDate, formatDisplayDateTime } from '#/utils';

const STATUS_LABELS: Record<ClaimStatus, string> = {
  pending: 'Pending',
  forwarded: 'Forwarded',
  approved: 'Approved',
  rejected: 'Rejected',
  infoRequested: 'Info Requested',
  resolved: 'Resolved',
};

const STATUS_VARIANTS: Record<ClaimStatus, NonNullable<BadgeProps['variant']>> = {
  pending: 'pending',
  forwarded: 'forwarded',
  approved: 'approved',
  rejected: 'rejected',
  infoRequested: 'info',
  resolved: 'resolved',
};

export const formatDate = (dateValue: string): string => {
  return formatDisplayDate(dateValue);
};

export const formatDateTime = (dateValue: string): string => {
  return formatDisplayDateTime(dateValue);
};

export const getStatusLabel = (status: ClaimStatus): string => STATUS_LABELS[status];

export const getStatusVariant = (status: ClaimStatus): NonNullable<BadgeProps['variant']> => STATUS_VARIANTS[status];
