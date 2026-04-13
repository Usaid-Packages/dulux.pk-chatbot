import type { BadgeProps } from '#/components/ui/Badge';
import { getClaimWorkflowStateLabel } from '#/constants';
import type { ClaimStatus, ClaimWorkflowState } from '#/types/claims.types';
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

const WORKFLOW_STATUS_VARIANTS: Record<ClaimWorkflowState, NonNullable<BadgeProps['variant']>> = {
  SUBMITTED: 'pending',
  IN_REVIEW: 'pending',
  QA_REVIEW: 'forwarded',
  QA_APPROVED: 'qaApproved',
  QA_REJECTED: 'rejected',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RESUBMIT: 'info',
  RESOLVED: 'resolved',
};

export const getStatusLabel = (status: ClaimStatus, workflowState?: ClaimWorkflowState): string => {
  if (workflowState) {
    return getClaimWorkflowStateLabel(workflowState);
  }

  return STATUS_LABELS[status];
};

export const getStatusVariant = (
  status: ClaimStatus,
  workflowState?: ClaimWorkflowState
): NonNullable<BadgeProps['variant']> => {
  if (workflowState) {
    return WORKFLOW_STATUS_VARIANTS[workflowState];
  }

  return STATUS_VARIANTS[status];
};
