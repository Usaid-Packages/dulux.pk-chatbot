import { toApiClaimWorkflowState, toUiClaimIssueType } from '#/constants';
import { qualityDetailSchema, qualityQueueResponseSchema } from '#/schemas/quality.schema';
import type { ClaimStatus, ClaimTimelineItem } from '#/types/claims.types';
import type {
  QualityDetail,
  QualityQueueItem,
  QualityQueueRequestParams,
  QualityQueueResponse,
  QualityQueueStatusFilter,
} from '#/types/quality.types';
import env from '#env';

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
  photo_type?: string;
  image?: ClaimImageAssetApiResponse;
  created?: string;
}

interface ResubmissionImageApiResponse {
  id?: number;
  image?: string;
  url?: string;
  created?: string;
}

interface ResubmissionEntryApiResponse {
  id?: number;
  requiredItem?: string;
  required_item?: string;
  responseText?: string;
  response_text?: string;
  image?: ResubmissionImageApiResponse;
  created?: string;
}

interface LatestResubmissionApiResponse {
  id?: number;
  source?: string;
  notes?: string;
  entries?: ResubmissionEntryApiResponse[];
  created?: string;
}

interface LinkedRegistrationApiResponse {
  id?: number;
  registrationCode?: string;
  registration_code?: string;
  customerName?: string;
  customer_name?: string;
  phoneNumber?: string;
  phone_number?: string;
  state?: string;
  purchaseDate?: string;
  purchase_date?: string;
  purchaseDealer?: string;
  purchase_dealer?: string;
  city?: string;
  created?: string;
}

interface ClaimPaintPairApiResponse {
  topcoatName?: string;
  topcoat_name?: string;
}

interface WarrantyClaimApiResponse {
  id?: number;
  registrationNumber?: string;
  registration_number?: string;
  claimNumber?: string;
  claim_number?: string;
  issueType?: string;
  issue_type?: string;
  state?: string;
  claimDate?: string;
  claim_date?: string;
  created?: string;
  modified?: string;
  notes?: string;
  city?: string;
  customerName?: string;
  customer_name?: string;
  forwardedBy?: string;
  forwarded_by?: string;
  forwardedAt?: string;
  forwarded_at?: string;
  affectedAreaSqft?: string;
  affected_area_sqft?: string;
  registration?: LinkedRegistrationApiResponse;
  paintPair?: ClaimPaintPairApiResponse;
  paint_pair?: ClaimPaintPairApiResponse;
  images?: ClaimImageApiResponse[];
  latestResubmission?: LatestResubmissionApiResponse | null;
  latest_resubmission?: LatestResubmissionApiResponse | null;
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

const toClaimNumber = (claimId: string, ...candidateValues: Array<string | undefined>): string => {
  for (const candidateValue of candidateValues) {
    const normalizedValue = candidateValue?.trim();
    if (!normalizedValue) {
      continue;
    }

    if (/^CLM-\d+$/i.test(normalizedValue)) {
      return `CLM-${normalizedValue.replace(/^CLM-/i, '')}`;
    }

    if (/^\d+$/.test(normalizedValue)) {
      return `CLM-${normalizedValue}`;
    }
  }

  return `CLM-${claimId || '0'}`;
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

const normalizeIssueType = (issueType: string | undefined) => {
  return toUiClaimIssueType(issueType ?? 'OTHERS');
};
const toNonEmptyDescription = (notes: string | undefined): string => {
  if (typeof notes !== 'string') {
    return 'No additional description provided.';
  }

  const normalizedNotes = notes.trim();
  return normalizedNotes.length > 0 ? normalizedNotes : 'No additional description provided.';
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

  if (normalizedState === 'QA_APPROVED') {
    return 'approved';
  }

  if (normalizedState === 'QA_REJECTED') {
    return 'rejected';
  }

  if (normalizedState === 'QA_REJECT') {
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
  const submittedAt = claim.claimDate ?? claim.claim_date ?? claim.created ?? UNKNOWN_TIMESTAMP;
  const forwardedAt = claim.forwardedAt ?? claim.forwarded_at ?? claim.modified ?? claim.created ?? submittedAt;

  return {
    id: claimId,
    claimNumber: toClaimNumber(claimId, claim.claimNumber, claim.claim_number),
    registrationNumber:
      claim.registrationNumber ??
      claim.registration_number ??
      linkedRegistration?.registrationCode ??
      linkedRegistration?.registration_code ??
      UNKNOWN_VALUE,
    customerName:
      claim.customerName ??
      claim.customer_name ??
      linkedRegistration?.customerName ??
      linkedRegistration?.customer_name ??
      'Unknown Customer',
    issueType: normalizeIssueType(claim.issueType ?? claim.issue_type),
    city: claim.city ?? '-',
    status: normalizeStatus(claim.state),
    workflowState: toApiClaimWorkflowState(claim.state ?? ''),
    forwardedBy: claim.forwardedBy ?? claim.forwarded_by ?? 'CS Team',
    forwardedAt,
    submittedAt,
  };
};

const toTimeline = (claim: WarrantyClaimApiResponse): ClaimTimelineItem[] => {
  const timeline: ClaimTimelineItem[] = [];
  const createdAt = claim.created ?? claim.claimDate ?? claim.claim_date ?? '';
  const modifiedAt = claim.modified ?? '';

  if (createdAt) {
    timeline.push({
      id: `${toId(claim.id)}-created`,
      event: 'Claim Submitted',
      actor: claim.registration?.customerName ?? claim.registration?.customer_name ?? 'Customer',
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
  const submittedAt = claim.claimDate ?? claim.claim_date ?? claim.created ?? UNKNOWN_TIMESTAMP;
  const forwardedAt = claim.forwardedAt ?? claim.forwarded_at ?? claim.modified ?? claim.created ?? submittedAt;
  const paintPair = claim.paintPair ?? claim.paint_pair;
  const latestResubmission = claim.latestResubmission ?? claim.latest_resubmission;
  const normalizedClaim: QualityDetail = {
    id: claimId,
    claimNumber: toClaimNumber(claimId, claim.claimNumber, claim.claim_number),
    customerName:
      claim.customerName ??
      claim.customer_name ??
      linkedRegistration?.customerName ??
      linkedRegistration?.customer_name ??
      'Unknown Customer',
    registrationId:
      linkedRegistration?.registrationCode ??
      linkedRegistration?.registration_code ??
      (registrationId || UNKNOWN_VALUE),
    issueType: normalizeIssueType(claim.issueType ?? claim.issue_type),
    photoCount: claim.images?.length ?? 0,
    submittedAt,
    workflowState: toApiClaimWorkflowState(claim.state ?? ''),
    status: normalizeStatus(claim.state),
    phone: linkedRegistration?.phoneNumber ?? linkedRegistration?.phone_number ?? '-',
    city: claim.city ?? linkedRegistration?.city ?? '-',
    areaSqFt: Number.parseFloat(claim.affectedAreaSqft ?? claim.affected_area_sqft ?? '1') || 1,
    topcoat: paintPair?.topcoatName ?? paintPair?.topcoat_name ?? '-',
    batchNumber: '-',
    description: toNonEmptyDescription(claim.notes),
    evidencePhotos: (claim.images ?? [])
      .map(image => ({
        id: toId(image.id),
        label: formatEnumLabel(image.photoType ?? image.photo_type),
        url: toAbsoluteUrl(image.image?.url ?? image.image?.image),
      }))
      .filter((image): image is { id: string; label: string; url: string } => Boolean(image.url)),
    timeline: toTimeline(claim),
    linkedRegistration: {
      registrationId: linkedRegistration?.registrationCode ?? linkedRegistration?.registration_code ?? UNKNOWN_VALUE,
      registrationRecordId: registrationId || UNKNOWN_VALUE,
      customerName: linkedRegistration?.customerName ?? linkedRegistration?.customer_name ?? 'Unknown Customer',
      purchaseDate: linkedRegistration?.purchaseDate ?? linkedRegistration?.purchase_date ?? UNKNOWN_TIMESTAMP,
      dealerName: linkedRegistration?.purchaseDealer ?? linkedRegistration?.purchase_dealer ?? '-',
      status: linkedRegistration?.state ?? '-',
    },
    csNotes: claim.notes,
    qualityNotes: claim.notes,
    forwardedBy: claim.forwardedBy ?? claim.forwarded_by ?? 'CS Team',
    forwardedAt,
    latestResubmission: latestResubmission
      ? {
          id: toId(latestResubmission.id),
          source: latestResubmission.source ?? 'UNKNOWN',
          notes: latestResubmission.notes ?? '',
          createdAt: latestResubmission.created ?? UNKNOWN_TIMESTAMP,
          entries: (latestResubmission.entries ?? []).map(entry => ({
            id: toId(entry.id),
            requiredItem: entry.requiredItem ?? entry.required_item ?? 'UNKNOWN_ITEM',
            responseText: entry.responseText ?? entry.response_text ?? '',
            imageUrl: toAbsoluteUrl(entry.image?.url ?? entry.image?.image),
            createdAt: entry.created ?? UNKNOWN_TIMESTAMP,
          })),
        }
      : undefined,
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
    page_size: filters.pageSize,
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
