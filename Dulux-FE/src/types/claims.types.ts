export const CLAIM_STATUSES = ['pending', 'forwarded', 'approved', 'rejected', 'infoRequested', 'resolved'] as const;
export const CLAIM_PRIORITIES = ['normal', 'high'] as const;
export const CLAIM_WORKFLOW_STATES = [
  'SUBMITTED',
  'IN_REVIEW',
  'QA_REVIEW',
  'QA_APPROVED',
  'QA_REJECTED',
  'APPROVED',
  'REJECTED',
  'RESUBMIT',
  'RESOLVED',
] as const;
export const CLAIM_ISSUE_TYPES = [
  'PEELING_CRACKING',
  'COLOR_FADING',
  'ALGAE_FUNGUS',
  'WATER_INGRESS',
  'COVERAGE_VARIANCE',
  'NON_UNIFORM_FINISH',
  'OTHERS',
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export type ClaimPriority = (typeof CLAIM_PRIORITIES)[number];
export type ClaimWorkflowState = (typeof CLAIM_WORKFLOW_STATES)[number];
export type ClaimIssueType = (typeof CLAIM_ISSUE_TYPES)[number];
export type ClaimListStatusFilter = 'all' | ClaimStatus;

export interface ClaimTimelineItem {
  id: string;
  event: string;
  actor: string;
  createdAt: string;
  note?: string;
}

export interface ClaimEvidencePhoto {
  id: string;
  label: string;
  url: string;
}

export interface LinkedRegistrationSummary {
  registrationId: string;
  registrationRecordId: string;
  customerName: string;
  purchaseDate: string;
  dealerName: string;
  status: string;
}

export interface ClaimListItem {
  id: string;
  claimNumber: string;
  customerName: string;
  registrationId: string;
  issueType: ClaimIssueType;
  photoCount: number;
  submittedAt: string;
  workflowState: ClaimWorkflowState;
  status: ClaimStatus;
  priority: ClaimPriority;
}

export interface ClaimDetail extends ClaimListItem {
  phone: string;
  city: string;
  areaSqFt: number;
  topcoat: string;
  batchNumber: string;
  description: string;
  evidencePhotos: ClaimEvidencePhoto[];
  timeline: ClaimTimelineItem[];
  linkedRegistration: LinkedRegistrationSummary;
  csNotes?: string;
  qualityNotes?: string;
  verificationPackSummary?: string;
  forwardedBy?: string;
  forwardedAt?: string;
}

export interface ClaimsStats {
  totalClaims: number;
  pendingReview: number;
  forwardedToQuality: number;
  resolved: number;
}

export interface ClaimsListRequestParams {
  status: ClaimListStatusFilter;
  issueType: 'all' | ClaimIssueType;
  search?: string;
  page: number;
  pageSize: number;
}

export interface ClaimsListResponse {
  items: ClaimListItem[];
  total: number;
  page: number;
  pageSize: number;
  stats: ClaimsStats;
}

export interface CreateClaimPayload extends Record<string, unknown> {
  registration: number;
  paintPair: number;
  issueType: string;
  affectedAreaSqft: string;
  notes: string;
  photos: {
    longShot: File;
    closeShot: File;
    alternateAngle: File;
  };
}

export interface ApproveClaimPayload extends Record<string, unknown> {
  id: string;
  notes?: string;
  notificationTemplate?: string;
  voucher: File;
}

export interface SendToQualityPayload extends Record<string, unknown> {
  id: string;
  notes: string;
}

export interface RejectClaimPayload extends Record<string, unknown> {
  id: string;
  notes: string;
  notificationTemplate?: string;
}

export interface RequestMoreInfoPayload extends Record<string, unknown> {
  id: string;
  items: string[];
  note?: string;
  priority: ClaimPriority;
}

export interface MarkClaimInReviewPayload extends Record<string, unknown> {
  id: string;
}
