import type { BadgeProps } from '#/components/ui/Badge';
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

const WORKFLOW_STATUS_LABELS: Partial<Record<ClaimWorkflowState, string>> = {
  QA_APPROVED: 'QA Approved',
  QA_REJECTED: 'QA Rejected',
};

const WORKFLOW_STATUS_VARIANTS: Partial<Record<ClaimWorkflowState, NonNullable<BadgeProps['variant']>>> = {
  QA_APPROVED: 'qaApproved',
};

export const getStatusLabel = (status: ClaimStatus, workflowState?: ClaimWorkflowState): string => {
  if (workflowState) {
    const workflowLabel = WORKFLOW_STATUS_LABELS[workflowState];
    if (workflowLabel) {
      return workflowLabel;
    }
  }

  return STATUS_LABELS[status];
};

export const getStatusVariant = (
  status: ClaimStatus,
  workflowState?: ClaimWorkflowState
): NonNullable<BadgeProps['variant']> => {
  if (workflowState) {
    const workflowVariant = WORKFLOW_STATUS_VARIANTS[workflowState];
    if (workflowVariant) {
      return workflowVariant;
    }
  }

  return STATUS_VARIANTS[status];
};
