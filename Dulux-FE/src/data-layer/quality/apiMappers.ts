/* eslint import/order: off */
import { toApiClaimWorkflowState, toUiClaimIssueType } from '#/constants';
import env from '#env';
import { qualityDetailSchema, qualityQueueResponseSchema } from '#/schemas/quality.schema';
import type {
  QualityDetail,
  QualityQueueItem,
  QualityQueueRequestParams,
  QualityQueueResponse,
  QualityQueueStatusFilter,
} from '#/types/quality.types';

import type { ClaimPriority, ClaimStatus, ClaimTimelineItem } from '#/types/claims.types';

interface PaginatedApiResponse<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
}

interface ClaimImageAssetApiResponse {
  id?: number;
  image?: string;
  url?: string;
}

interface ClaimImageApiResponse {
  id?: number;
  photoType?: string;
  image?: ClaimImageAssetApiResponse;
  created?: string;
}

interface LinkedRegistrationApiResponse {
  id?: number;
  registrationCode?: string;
  customerName?: string;
  phoneNumber?: string;
  state?: string;
  purchaseDate?: string;
  purchaseDealer?: string;
  created?: string;
}

interface ClaimPaintPairApiResponse {
  topcoatName?: string;
}

interface WarrantyClaimApiResponse {
  id?: number;
  registrationNumber?: string;
  claimNumber?: string;
  issueType?: string;
  state?: string;
  claimDate?: string;
  created?: string;
  modified?: string;
  notes?: string;
  priority?: string;
  city?: string;
  customerName?: string;
  forwardedBy?: string;
  forwardedAt?: string;
  affectedAreaSqft?: string;
  registration?: LinkedRegistrationApiResponse;
  paintPair?: ClaimPaintPairApiResponse;
  images?: ClaimImageApiResponse[];
}

const QUALITY_RESOLVED_STATUSES: readonly ClaimStatus[] = ['approved', 'rejected', 'resolved'] as const;
const UNKNOWN_TIMESTAMP = 'unknown';
const UNKNOWN_VALUE = 'N/A';

const toId = (value: number | string | undefined): string => {
  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  return '';
};

const toAbsoluteUrl = (urlValue: string | undefined): string | undefined => {
  if (!urlValue || urlValue.trim().length === 0) {
    return undefined;
  }

  try {
    return new URL(urlValue, env.VITE_BACKEND_BASE_URL).toString();
  } catch {
    return undefined;
  }
};

const formatEnumLabel = (value: string | undefined): string => {
  if (!value) {
    return 'Unknown';
  }

  return value
    .toLowerCase()
    .split('_')
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
};

const normalizePriority = (priority: string | undefined): ClaimPriority => {
  return priority?.toLowerCase() === 'high' ? 'high' : 'normal';
};

const normalizeIssueType = (issueType: string | undefined) => {
  return toUiClaimIssueType(issueType ?? 'OTHERS');
};

const normalizeStatus = (apiState: string | undefined): ClaimStatus => {
  const normalizedState = apiState?.toUpperCase() ?? '';

  if (normalizedState === 'QA_REVIEW') {
    return 'forwarded';
  }

  if (normalizedState === 'RESUBMIT') {
    return 'infoRequested';
  }

  if (normalizedState === 'APPROVED') {
    return 'approved';
  }

  if (normalizedState === 'REJECTED') {
    return 'rejected';
  }

  if (normalizedState === 'RESOLVED') {
    return 'resolved';
  }

  return 'pending';
};

const toQueueItem = (claim: WarrantyClaimApiResponse): QualityQueueItem => {
  const claimId = toId(claim.id);
  const linkedRegistration = claim.registration;
  const submittedAt = claim.claimDate ?? claim.created ?? UNKNOWN_TIMESTAMP;
  const forwardedAt = claim.forwardedAt ?? claim.modified ?? claim.created ?? submittedAt;

  return {
    id: claimId,
    claimNumber: claim.claimNumber ?? claim.registrationNumber ?? `CLM-${claimId || '0'}`,
    customerName: claim.customerName ?? linkedRegistration?.customerName ?? 'Unknown Customer',
    issueType: normalizeIssueType(claim.issueType),
    city: claim.city ?? '-',
    priority: normalizePriority(claim.priority),
    status: normalizeStatus(claim.state),
    forwardedBy: claim.forwardedBy ?? 'CS Team',
    forwardedAt,
    submittedAt,
  };
};

const toTimeline = (claim: WarrantyClaimApiResponse): ClaimTimelineItem[] => {
  const timeline: ClaimTimelineItem[] = [];
  const createdAt = claim.created ?? claim.claimDate ?? '';
  const modifiedAt = claim.modified ?? '';

  if (createdAt) {
    timeline.push({
      id: `${toId(claim.id)}-created`,
      event: 'Claim Submitted',
      actor: claim.registration?.customerName ?? 'Customer',
      createdAt,
    });
  }

  if (modifiedAt) {
    timeline.push({
      id: `${toId(claim.id)}-updated`,
      event: `Status: ${formatEnumLabel(claim.state)}`,
      actor: 'Quality Team',
      createdAt: modifiedAt,
      note: claim.notes,
    });
  }

  return timeline;
};

export const mapQualityClaimDetail = (claim: WarrantyClaimApiResponse): QualityDetail => {
  const claimId = toId(claim.id);
  const linkedRegistration = claim.registration;
  const registrationId = toId(linkedRegistration?.id);
  const submittedAt = claim.claimDate ?? claim.created ?? UNKNOWN_TIMESTAMP;
  const forwardedAt = claim.forwardedAt ?? claim.modified ?? claim.created ?? submittedAt;
  const normalizedClaim: QualityDetail = {
    id: claimId,
    claimNumber: claim.claimNumber ?? claim.registrationNumber ?? `CLM-${claimId || '0'}`,
    customerName: claim.customerName ?? linkedRegistration?.customerName ?? 'Unknown Customer',
    registrationId: linkedRegistration?.registrationCode ?? (registrationId || UNKNOWN_VALUE),
    issueType: normalizeIssueType(claim.issueType),
    photoCount: claim.images?.length ?? 0,
    submittedAt,
    workflowState: toApiClaimWorkflowState(claim.state ?? ''),
    status: normalizeStatus(claim.state),
    priority: normalizePriority(claim.priority),
    phone: linkedRegistration?.phoneNumber ?? '-',
    city: claim.city ?? '-',
    areaSqFt: Number.parseFloat(claim.affectedAreaSqft ?? '1') || 1,
    topcoat: claim.paintPair?.topcoatName ?? '-',
    batchNumber: '-',
    description: claim.notes ?? 'No additional description provided.',
    evidencePhotos: (claim.images ?? [])
      .map(image => ({
        id: toId(image.id),
        label: formatEnumLabel(image.photoType),
        url: toAbsoluteUrl(image.image?.url ?? image.image?.image),
      }))
      .filter((image): image is { id: string; label: string; url: string } => Boolean(image.url)),
    timeline: toTimeline(claim),
    linkedRegistration: {
      registrationId: linkedRegistration?.registrationCode ?? UNKNOWN_VALUE,
      registrationRecordId: registrationId || UNKNOWN_VALUE,
      customerName: linkedRegistration?.customerName ?? 'Unknown Customer',
      purchaseDate: linkedRegistration?.purchaseDate ?? UNKNOWN_TIMESTAMP,
      dealerName: linkedRegistration?.purchaseDealer ?? '-',
      status: linkedRegistration?.state ?? '-',
    },
    csNotes: claim.notes,
    qualityNotes: claim.notes,
    forwardedBy: claim.forwardedBy ?? 'CS Team',
    forwardedAt,
  };

  return qualityDetailSchema.parse(normalizedClaim);
};

const matchesStatusFilter = (status: ClaimStatus, filter: QualityQueueStatusFilter): boolean => {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'forwarded') {
    return status === 'forwarded';
  }

  if (filter === 'infoRequested') {
    return status === 'infoRequested';
  }

  return QUALITY_RESOLVED_STATUSES.includes(status);
};

export const mapQualityQueueResponse = ({
  response,
  filters,
  stats,
}: {
  response: PaginatedApiResponse<WarrantyClaimApiResponse>;
  filters: QualityQueueRequestParams;
  stats: QualityQueueResponse['stats'];
}): QualityQueueResponse => {
  const parsedItems = (response.results ?? [])
    .map(toQueueItem)
    .filter(queueItem => matchesStatusFilter(queueItem.status, filters.status));

  const total = filters.status === 'resolved' ? parsedItems.length : (response.count ?? parsedItems.length);

  const normalizedQueue: QualityQueueResponse = {
    items: parsedItems,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    stats,
  };

  return qualityQueueResponseSchema.parse(normalizedQueue);
};

const buildStateFilter = (status: QualityQueueStatusFilter): string | undefined => {
  if (status === 'forwarded') {
    return 'QA_REVIEW';
  }

  if (status === 'infoRequested') {
    return 'RESUBMIT';
  }

  return undefined;
};

export const getQualityListQueryParams = (filters: QualityQueueRequestParams): Record<string, string | number> => {
  const state = buildStateFilter(filters.status);
  const params: Record<string, string | number> = {
    page: filters.page,
    pageSize: filters.pageSize,
  };

  if (state) {
    params.state = state;
  }

  return params;
};

export const countFromResponse = (response: PaginatedApiResponse<unknown>): number => {
  return response.count ?? 0;
};

export type { PaginatedApiResponse, WarrantyClaimApiResponse };
