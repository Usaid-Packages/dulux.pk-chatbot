import type { ClaimIssueType, ClaimListItem, ClaimListStatusFilter, ClaimWorkflowState } from '#/types/claims.types';

const ISSUE_TYPE_TO_UI_MAP: Record<string, ClaimIssueType> = {
  PEELING_CRACKING: 'PEELING_CRACKING',
  COLOR_FADING: 'COLOR_FADING',
  DISCOLORATION_FADING: 'COLOR_FADING',
  ALGAE_FUNGUS: 'ALGAE_FUNGUS',
  WATER_INGRESS: 'WATER_INGRESS',
  COVERAGE_VARIANCE: 'COVERAGE_VARIANCE',
  NON_UNIFORM_FINISH: 'NON_UNIFORM_FINISH',
  OTHERS: 'OTHERS',
  OTHER: 'OTHERS',
};

const STATUS_TO_UI_MAP: Record<string, ClaimListItem['status']> = {
  SUBMITTED: 'pending',
  IN_REVIEW: 'pending',
  QA_REVIEW: 'forwarded',
  QA_APPROVED: 'pending',
  QA_REJECT: 'pending',
  QA_REJECTED: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RESUBMIT: 'infoRequested',
  RESOLVED: 'resolved',
};

const WORKFLOW_STATE_MAP: Record<string, ClaimWorkflowState> = {
  SUBMITTED: 'SUBMITTED',
  IN_REVIEW: 'IN_REVIEW',
  QA_REVIEW: 'QA_REVIEW',
  QA_APPROVED: 'QA_APPROVED',
  QA_REJECT: 'QA_REJECTED',
  QA_REJECTED: 'QA_REJECTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RESUBMIT: 'RESUBMIT',
  RESOLVED: 'RESOLVED',
};

const UI_STATUS_TO_API_MAP: Record<Exclude<ClaimListStatusFilter, 'all'>, string> = {
  pending: 'SUBMITTED',
  forwarded: 'QA_REVIEW',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  infoRequested: 'RESUBMIT',
  resolved: 'RESOLVED',
};

const ISSUE_TYPE_TO_API_MAP: Record<ClaimIssueType, string> = {
  PEELING_CRACKING: 'PEELING_CRACKING',
  COLOR_FADING: 'COLOR_FADING',
  ALGAE_FUNGUS: 'ALGAE_FUNGUS',
  WATER_INGRESS: 'WATER_INGRESS',
  COVERAGE_VARIANCE: 'COVERAGE_VARIANCE',
  NON_UNIFORM_FINISH: 'NON_UNIFORM_FINISH',
  OTHERS: 'OTHERS',
};

const ISSUE_TYPE_LABELS: Record<ClaimIssueType, string> = {
  PEELING_CRACKING: 'Peeling / Cracking',
  COLOR_FADING: 'Color Fading',
  ALGAE_FUNGUS: 'Algae / Fungus',
  WATER_INGRESS: 'Water Ingress',
  COVERAGE_VARIANCE: 'Coverage Variance',
  NON_UNIFORM_FINISH: 'Non-uniform Finish',
  OTHERS: 'Others',
};

export const toUiClaimIssueType = (issueType: string): ClaimIssueType => ISSUE_TYPE_TO_UI_MAP[issueType] ?? 'OTHERS';

export const getClaimIssueTypeLabel = (issueType: string): string => {
  const normalizedIssueType = toUiClaimIssueType(issueType);
  return ISSUE_TYPE_LABELS[normalizedIssueType];
};

const normalizeEnumKey = (value: string): string => value.trim().toUpperCase();

export const toUiClaimStatus = (status: string): ClaimListItem['status'] =>
  STATUS_TO_UI_MAP[normalizeEnumKey(status)] ?? 'pending';

export const toApiClaimWorkflowState = (state: string): ClaimWorkflowState =>
  WORKFLOW_STATE_MAP[normalizeEnumKey(state)] ?? 'IN_REVIEW';

export const toClaimsStateFilter = (status: ClaimListStatusFilter): string | undefined => {
  if (status === 'all') {
    return undefined;
  }
  return UI_STATUS_TO_API_MAP[status];
};

export const toClaimsIssueTypeFilter = (issueType: 'all' | ClaimIssueType): string | undefined => {
  if (issueType === 'all') {
    return undefined;
  }
  return ISSUE_TYPE_TO_API_MAP[issueType];
};
