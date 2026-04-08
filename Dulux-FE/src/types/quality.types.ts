import type { ClaimDetail, ClaimPriority, ClaimStatus } from '#/types/claims.types';

export const QUALITY_DECISION_TYPES = ['REQUEST_INFO', 'QA_APPROVED', 'QA_REJECTED'] as const;
export const QUALITY_TECHNICAL_REASONS = [
  'INSUFFICIENT_EVIDENCE',
  'APPLICATION_ERROR',
  'SURFACE_PREPARATION_ISSUE',
  'WRONG_PRODUCT_USAGE',
  'ENVIRONMENTAL_FACTOR',
  'OUT_OF_SCOPE_WARRANTY',
  'SUSPECTED_TAMPERING',
  'DUPLICATE_OR_INVALID_CLAIM',
  'OTHER',
] as const;
export const QUALITY_REQUIRED_ITEMS = [
  'ADDITIONAL_PHOTOS_DIFFERENT_ANGLES',
  'CLOSE_UP_DAMAGE_PHOTOS',
  'PROOF_OF_PURCHASE_INVOICE',
  'PRODUCT_BATCH_NUMBER_PHOTO',
  'APPLICATION_DETAILS_METHOD_COATS_PREP',
  'ISSUE_TIMELINE_DETAILS',
  'SITE_CONDITIONS_INFO',
  'OTHER',
] as const;

export type QualityQueueStatusFilter = 'all' | 'forwarded' | 'infoRequested' | 'resolved';
export type QualityTechnicalReason = (typeof QUALITY_TECHNICAL_REASONS)[number];
export type QualityRequiredItem = (typeof QUALITY_REQUIRED_ITEMS)[number];

export interface QualityResubmissionEntry {
  id: string;
  requiredItem: string;
  responseText: string;
  imageUrl?: string;
  createdAt: string;
}

export interface QualityLatestResubmission {
  id: string;
  source: string;
  notes: string;
  createdAt: string;
  entries: QualityResubmissionEntry[];
}

export interface QualityQueueItem {
  id: string;
  claimNumber: string;
  customerName: string;
  issueType: string;
  city: string;
  priority: ClaimPriority;
  status: ClaimStatus;
  forwardedBy: string;
  forwardedAt: string;
  submittedAt: string;
}

export interface QualityQueueStats {
  totalInQueue: number;
  awaitingReview: number;
  infoRequested: number;
  resolvedToday: number;
}

export interface QualityQueueRequestParams {
  status: QualityQueueStatusFilter;
  page: number;
  pageSize: number;
}

export interface QualityQueueResponse {
  items: QualityQueueItem[];
  total: number;
  page: number;
  pageSize: number;
  stats: QualityQueueStats;
}

export interface QualityApprovePayload extends Record<string, unknown> {
  id: string;
  technicalNotes: string;
  notificationTemplate: string;
}

export interface QualityRejectPayload extends Record<string, unknown> {
  id: string;
  technicalReason: QualityTechnicalReason;
  technicalNotes: string;
  notificationTemplate: string;
}

export interface QualityRequestInfoPayload extends Record<string, unknown> {
  id: string;
  requiredItems: QualityRequiredItem[];
  notes?: string;
  otherText?: string;
}

export interface QualityDetail extends ClaimDetail {
  forwardedBy: string;
  forwardedAt: string;
  latestResubmission?: QualityLatestResubmission;
}
