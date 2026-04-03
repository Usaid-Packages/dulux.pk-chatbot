/* eslint import/order: off */
import type { ClaimDetail, ClaimPriority, ClaimStatus } from '#/types/claims.types';

export const QUALITY_REQUEST_FROM_OPTIONS = ['cs_agent', 'customer'] as const;

export type QualityRequestFrom = (typeof QUALITY_REQUEST_FROM_OPTIONS)[number];
export type QualityQueueStatusFilter = 'all' | 'forwarded' | 'infoRequested' | 'resolved';

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
  assessment: string;
  notes?: string;
}

export interface QualityRejectPayload extends Record<string, unknown> {
  id: string;
  reason: string;
  technicalNotes: string;
}

export interface QualityRequestInfoPayload extends Record<string, unknown> {
  id: string;
  items: string[];
  notes?: string;
  requestFrom: QualityRequestFrom;
}

export interface QualityDetail extends ClaimDetail {
  forwardedBy: string;
  forwardedAt: string;
}
