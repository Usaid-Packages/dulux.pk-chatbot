import type { BadgeProps } from '#/components/ui/Badge';
import type { ClaimPriority } from '#/types/claims.types';
import { formatDisplayDate, formatDisplayDateTime } from '#/utils';

const PRIORITY_LABELS: Record<ClaimPriority, string> = {
  high: 'High',
  normal: 'Normal',
};

const PRIORITY_CLASSES: Record<ClaimPriority, string> = {
  high: 'border-priority-high-text/30 bg-priority-high-bg text-priority-high-text',
  normal: 'border-priority-normal-dot/30 bg-priority-normal-bg text-priority-normal-text',
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
  return formatDisplayDate(dateValue);
};

export const formatDateTime = (dateValue: string): string => {
  return formatDisplayDateTime(dateValue);
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
