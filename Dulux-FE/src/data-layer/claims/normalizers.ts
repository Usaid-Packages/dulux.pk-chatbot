import { toUiClaimIssueType, toUiClaimStatus } from '#/constants';
import { claimDetailSchema, claimListItemSchema } from '#/schemas/claim.schema';
import type { ApiClaimDetail, ApiClaimListItem, ApiPaginationResponse } from '#/types/claims.api.types';
import type { ClaimDetail, ClaimListItem, ClaimsListResponse, ClaimsStats } from '#/types/claims.types';

const DEFAULT_PAGE_SIZE = 10;
const UNKNOWN_VALUE = 'N/A';
const FALLBACK_DATE = new Date(0).toISOString();
const DEFAULT_AREA_SQFT = 1;

const toClaimNumber = (id: number): string => `CLM-${id}`;
const asString = (value: unknown, fallback: string = UNKNOWN_VALUE): string =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;
const asIdString = (value: unknown, fallback: string = UNKNOWN_VALUE): string => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(value);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return fallback;
};
const asNumber = (value: unknown): number => {
  const parsed = Number.parseFloat(asString(value, String(DEFAULT_AREA_SQFT)));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AREA_SQFT;
};
const normalizeLabel = (value: unknown): string => asString(value).replaceAll('_', ' ');
const readIssueType = (claim: ApiClaimListItem | ApiClaimDetail): string =>
  asString(
    (claim as { issue_type?: string; issueType?: string }).issue_type ?? (claim as { issueType?: string }).issueType
  );
const readSubmittedAt = (claim: ApiClaimListItem | ApiClaimDetail): string =>
  asString(
    (claim as { claim_date?: string; claimDate?: string }).claim_date ?? (claim as { claimDate?: string }).claimDate,
    FALLBACK_DATE
  );
const readState = (claim: ApiClaimListItem | ApiClaimDetail): string =>
  asString((claim as { state?: string; status?: string }).state ?? (claim as { status?: string }).status, 'SUBMITTED');
const readRegistrationCode = (claim: ApiClaimDetail): string =>
  asString(
    (claim.registration as { registration_code?: string; registrationCode?: string } | undefined)?.registration_code ??
      (claim.registration as { registrationCode?: string } | undefined)?.registrationCode
  );
const readRegistrationRecordId = (claim: ApiClaimDetail): string =>
  asIdString((claim.registration as { id?: number | string } | undefined)?.id);

const toClaimListItem = (claim: ApiClaimListItem): ClaimListItem =>
  claimListItemSchema.parse({
    id: String(claim.id),
    claimNumber: toClaimNumber(claim.id),
    customerName: UNKNOWN_VALUE,
    registrationId: claim.registration_number ?? claim.registration_code ?? UNKNOWN_VALUE,
    issueType: toUiClaimIssueType(readIssueType(claim)),
    photoCount: 0,
    submittedAt: readSubmittedAt(claim),
    status: toUiClaimStatus(readState(claim)),
    priority: 'normal',
  });

const getListStats = (items: ClaimListItem[], total: number): ClaimsStats => ({
  totalClaims: total,
  pendingReview: items.filter(item => item.status === 'pending').length,
  forwardedToQuality: items.filter(item => item.status === 'forwarded').length,
  resolved: items.filter(item => item.status === 'resolved').length,
});

export const normalizeClaimsListResponse = (
  response: ApiPaginationResponse<ApiClaimListItem>,
  page: number,
  pageSize: number
): ClaimsListResponse => {
  const normalizedItems = response.results.map(toClaimListItem);

  return {
    items: normalizedItems,
    total: response.count,
    page,
    pageSize: pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE,
    stats: getListStats(normalizedItems, response.count),
  };
};

export const normalizeClaimDetail = (claim: ApiClaimDetail): ClaimDetail =>
  claimDetailSchema.parse({
    id: String(claim.id),
    claimNumber: toClaimNumber(claim.id),
    customerName: asString(claim.registration?.customer_name),
    registrationId: asString(claim.registration?.registration_code),
    issueType: toUiClaimIssueType(readIssueType(claim)),
    photoCount: Array.isArray(claim.images) ? claim.images.length : 0,
    submittedAt: readSubmittedAt(claim),
    status: toUiClaimStatus(readState(claim)),
    priority: 'normal',
    phone: asString(claim.registration?.phone_number),
    city: UNKNOWN_VALUE,
    areaSqFt: asNumber(claim.affected_area_sqft),
    topcoat: asString(claim.paint_pair?.topcoat_name),
    batchNumber: UNKNOWN_VALUE,
    description: asString(claim.notes, 'No description provided.'),
    evidencePhotos: (claim.images ?? []).reduce<ClaimDetail['evidencePhotos']>((photos, image) => {
      const url = image.image?.image;
      if (typeof url !== 'string' || url.trim().length === 0) {
        return photos;
      }
      photos.push({
        id: String(image.id),
        label: normalizeLabel(image.photo_type),
        url,
      });
      return photos;
    }, []),
    timeline: [
      {
        id: `state-${claim.id}-${claim.modified}`,
        event: `State changed to ${normalizeLabel(readState(claim))}`,
        actor: asString(claim.approved_by, 'System'),
        createdAt: asString(claim.modified, FALLBACK_DATE),
        note: claim.notes || undefined,
      },
    ],
    linkedRegistration: {
      registrationId: readRegistrationCode(claim),
      registrationRecordId: readRegistrationRecordId(claim),
      customerName: asString(claim.registration?.customer_name),
      purchaseDate: asString(claim.registration?.purchase_date, FALLBACK_DATE),
      dealerName: UNKNOWN_VALUE,
      status: asString(claim.registration?.state),
    },
    csNotes: claim.notes || undefined,
    forwardedBy: claim.approved_by ?? undefined,
    forwardedAt: claim.approved_at ?? undefined,
  });
