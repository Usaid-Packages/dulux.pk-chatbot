import type { BadgeProps } from '#/components/ui/Badge';
import type { ClaimWorkflowState } from '#/types/claims.types';
import { formatDisplayDate, formatDisplayDateTime } from '#/utils';

const QUALITY_STATUS_LABELS: Record<string, string> = {
  forwarded: 'Awaiting Review',
  infoRequested: 'Info Requested',
  approved: 'Approved',
  rejected: 'Rejected',
  resolved: 'Resolved',
};

const QUALITY_WORKFLOW_STATUS_LABELS: Partial<Record<ClaimWorkflowState, string>> = {
  QA_APPROVED: 'QA Approved',
  QA_REJECTED: 'QA Rejected',
};

const QUALITY_WORKFLOW_STATUS_VARIANTS: Partial<Record<ClaimWorkflowState, NonNullable<BadgeProps['variant']>>> = {
  QA_APPROVED: 'qaApproved',
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

export const getQualityStatusLabel = (status: string, workflowState?: ClaimWorkflowState): string => {
  if (workflowState) {
    const workflowLabel = QUALITY_WORKFLOW_STATUS_LABELS[workflowState];
    if (workflowLabel) {
      return workflowLabel;
    }
  }

  return QUALITY_STATUS_LABELS[status] ?? 'Unknown';
};

export const getQualityStatusVariant = (
  status: string,
  workflowState?: ClaimWorkflowState
): NonNullable<BadgeProps['variant']> => {
  if (workflowState) {
    const workflowVariant = QUALITY_WORKFLOW_STATUS_VARIANTS[workflowState];
    if (workflowVariant) {
      return workflowVariant;
    }
  }

  return QUALITY_STATUS_VARIANTS[status] ?? 'default';
};
