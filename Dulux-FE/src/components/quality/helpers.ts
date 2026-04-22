import type { BadgeProps } from '#/components/ui/Badge';
import { getClaimWorkflowStateLabel } from '#/constants';
import type { ClaimWorkflowState } from '#/types/claims.types';

const QUALITY_STATUS_LABELS: Record<string, string> = {
  forwarded: 'Awaiting Review',
  infoRequested: 'Info Requested',
  approved: 'Approved',
  rejected: 'Rejected',
  resolved: 'Resolved',
};

const QUALITY_WORKFLOW_STATUS_VARIANTS: Record<ClaimWorkflowState, NonNullable<BadgeProps['variant']>> = {
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

const QUALITY_STATUS_VARIANTS: Record<string, NonNullable<BadgeProps['variant']>> = {
  forwarded: 'forwarded',
  infoRequested: 'info',
  approved: 'approved',
  rejected: 'rejected',
  resolved: 'resolved',
};

export const getQualityStatusLabel = (status: string, workflowState?: ClaimWorkflowState): string => {
  if (workflowState) {
    return getClaimWorkflowStateLabel(workflowState);
  }

  return QUALITY_STATUS_LABELS[status] ?? 'Unknown';
};

export const getQualityStatusVariant = (
  status: string,
  workflowState?: ClaimWorkflowState
): NonNullable<BadgeProps['variant']> => {
  if (workflowState) {
    return QUALITY_WORKFLOW_STATUS_VARIANTS[workflowState];
  }

  return QUALITY_STATUS_VARIANTS[status] ?? 'default';
};
