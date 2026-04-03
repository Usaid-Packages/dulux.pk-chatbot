import type { BadgeProps } from '#/components/ui/Badge';
import type { ClaimStatus } from '#/types/claims.types';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

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
  const timestamp = Date.parse(dateValue);
  if (Number.isNaN(timestamp)) {
    return 'Unknown';
  }
  return DATE_FORMATTER.format(timestamp);
};

export const formatDateTime = (dateValue: string): string => {
  const timestamp = Date.parse(dateValue);
  if (Number.isNaN(timestamp)) {
    return 'Unknown';
  }
  return DATE_TIME_FORMATTER.format(timestamp);
};

export const getStatusLabel = (status: ClaimStatus): string => STATUS_LABELS[status];

export const getStatusVariant = (status: ClaimStatus): NonNullable<BadgeProps['variant']> => STATUS_VARIANTS[status];
