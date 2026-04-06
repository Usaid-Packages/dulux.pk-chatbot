import type { BadgeProps } from '#/components/ui/Badge';
import type { ClaimPriority } from '#/types/claims.types';

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

const PRIORITY_LABELS: Record<ClaimPriority, string> = {
  high: 'High',
  normal: 'Normal',
};

const PRIORITY_CLASSES: Record<ClaimPriority, string> = {
  high: 'bg-priority-high-bg text-priority-high-text',
  normal: 'bg-priority-normal-bg text-priority-normal-text',
};

const QUALITY_STATUS_LABELS: Record<string, string> = {
  forwarded: 'Awaiting Review',
  infoRequested: 'Info Requested',
  approved: 'Approved',
  rejected: 'Rejected',
  resolved: 'Resolved',
};

const QUALITY_STATUS_VARIANTS: Record<string, NonNullable<BadgeProps['variant']>> = {
  forwarded: 'forwarded',
  infoRequested: 'info',
  approved: 'approved',
  rejected: 'rejected',
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

export const getPriorityLabel = (priority: ClaimPriority): string => {
  return PRIORITY_LABELS[priority];
};

export const getPriorityClass = (priority: ClaimPriority): string => {
  return PRIORITY_CLASSES[priority];
};

export const getQualityStatusLabel = (status: string): string => {
  return QUALITY_STATUS_LABELS[status] ?? 'Unknown';
};

export const getQualityStatusVariant = (status: string): NonNullable<BadgeProps['variant']> => {
  return QUALITY_STATUS_VARIANTS[status] ?? 'default';
};
