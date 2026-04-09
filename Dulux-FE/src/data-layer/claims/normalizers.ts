import { toApiClaimWorkflowState, toUiClaimIssueType, toUiClaimStatus } from '#/constants';
import { claimDetailSchema, claimListItemSchema } from '#/schemas/claim.schema';
import type { ApiClaimDetail, ApiClaimListItem, ApiPaginationResponse } from '#/types/claims.api.types';
import type { ClaimDetail, ClaimListItem, ClaimsListResponse, ClaimsStats } from '#/types/claims.types';

const DEFAULT_PAGE_SIZE = 10;
const UNKNOWN_VALUE = 'N/A';
const FALLBACK_DATE = new Date(0).toISOString();
const DEFAULT_AREA_SQFT = 1;
const CLAIM_PHOTO_TYPE_LABELS: Record<string, string> = {
  LONG_SHOT: 'Long Shot',
  CLOSE_SHOT: 'Close Shot',
  ALTERNATE_ANGLE: 'Alternate Angle',
};

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
const toTitleCaseLabel = (value: string): string =>
  value
    .toLowerCase()
    .split('_')
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
const readEvidencePhotoLabel = (
  image: {
    photo_type?: unknown;
    photoType?: unknown;
  },
  fallbackIndex: number
): string => {
  const photoTypeRaw =
    (typeof image.photo_type === 'string' ? image.photo_type : null) ??
    (typeof image.photoType === 'string' ? image.photoType : null);

  if (!photoTypeRaw) {
    return `Evidence Photo ${fallbackIndex}`;
  }

  const normalizedPhotoType = photoTypeRaw.trim().toUpperCase();
  if (CLAIM_PHOTO_TYPE_LABELS[normalizedPhotoType]) {
    return CLAIM_PHOTO_TYPE_LABELS[normalizedPhotoType];
  }

  return toTitleCaseLabel(normalizedPhotoType);
};
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
const readRegistrationSummary = (
  claim: ApiClaimListItem
):
  | {
      customerName?: string;
      registrationNumber?: string | number;
      registrationCode?: string | number;
      id?: string | number;
    }
  | undefined => {
  const registration = (claim as ApiClaimListItem & { registration?: unknown }).registration;
  if (!registration || typeof registration !== 'object') {
    return undefined;
  }

  return registration as {
    customerName?: string;
    registrationNumber?: string | number;
    registrationCode?: string | number;
    id?: string | number;
  };
};
const readListCustomerName = (claim: ApiClaimListItem): string => {
  const registration = readRegistrationSummary(claim);
  const claimWithAliases = claim as ApiClaimListItem & {
    customerName?: string;
    customer?: string;
  };
  return asString(claimWithAliases.customerName ?? claimWithAliases.customer ?? registration?.customerName);
};
const readListRegistrationId = (claim: ApiClaimListItem): string => {
  const registration = readRegistrationSummary(claim);
  const claimWithAliases = claim as ApiClaimListItem & {
    registrationNumber?: string | number;
    registrationId?: string | number;
    registration?: string | number;
  };
  return asIdString(
    claimWithAliases.registrationNumber ??
      claimWithAliases.registrationId ??
      claimWithAliases.registrationCode ??
      claimWithAliases.registration ??
      registration?.registrationNumber ??
      registration?.registrationCode ??
      registration?.id
  );
};
const readRegistrationCode = (claim: ApiClaimDetail): string =>
  asString(
    (claim.registration as { registration_code?: string; registrationCode?: string } | undefined)?.registration_code ??
      (claim.registration as { registrationCode?: string } | undefined)?.registrationCode
  );
const readRegistrationRecordId = (claim: ApiClaimDetail): string =>
  asIdString((claim.registration as { id?: number | string } | undefined)?.id);
const readRegistrationCustomerName = (claim: ApiClaimDetail): string =>
  asString(
    (claim.registration as { customer_name?: string; customerName?: string } | undefined)?.customer_name ??
      (claim.registration as { customerName?: string } | undefined)?.customerName
  );
const readRegistrationPhone = (claim: ApiClaimDetail): string =>
  asString(
    (claim.registration as { phone_number?: string; phoneNumber?: string } | undefined)?.phone_number ??
      (claim.registration as { phoneNumber?: string } | undefined)?.phoneNumber
  );
const readRegistrationPurchaseDate = (claim: ApiClaimDetail): string =>
  asString(
    (claim.registration as { purchase_date?: string; purchaseDate?: string } | undefined)?.purchase_date ??
      (claim.registration as { purchaseDate?: string } | undefined)?.purchaseDate,
    FALLBACK_DATE
  );
const readRegistrationDealer = (claim: ApiClaimDetail): string =>
  asString(
    (claim.registration as { purchase_dealer?: string; purchaseDealer?: string } | undefined)?.purchase_dealer ??
      (claim.registration as { purchaseDealer?: string } | undefined)?.purchaseDealer
  );
const readRegistrationState = (claim: ApiClaimDetail): string =>
  asString((claim.registration as { state?: string } | undefined)?.state);
const readCity = (claim: ApiClaimDetail): string =>
  asString(
    (claim.registration as { city?: string } | undefined)?.city ?? (claim as { city?: string }).city,
    UNKNOWN_VALUE
  );
const readTopcoatName = (claim: ApiClaimDetail): string =>
  asString(
    (claim.paint_pair as { topcoat_name?: string; topcoatName?: string } | undefined)?.topcoat_name ??
      (claim.paint_pair as { topcoatName?: string } | undefined)?.topcoatName ??
      (claim as { paintPair?: { topcoatName?: string; topcoat_name?: string } }).paintPair?.topcoatName ??
      (claim as { paintPair?: { topcoatName?: string; topcoat_name?: string } }).paintPair?.topcoat_name
  );
const readAffectedArea = (claim: ApiClaimDetail): unknown =>
  (claim as { affected_area_sqft?: unknown; affectedAreaSqft?: unknown }).affected_area_sqft ??
  (claim as { affectedAreaSqft?: unknown }).affectedAreaSqft;

const toClaimListItem = (claim: ApiClaimListItem): ClaimListItem =>
  claimListItemSchema.parse({
    id: String(claim.id),
    claimNumber: toClaimNumber(claim.id),
    customerName: readListCustomerName(claim),
    registrationId: readListRegistrationId(claim),
    issueType: toUiClaimIssueType(readIssueType(claim)),
    photoCount: 0,
    submittedAt: readSubmittedAt(claim),
    workflowState: toApiClaimWorkflowState(readState(claim)),
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
    customerName: readRegistrationCustomerName(claim),
    registrationId: readRegistrationCode(claim),
    issueType: toUiClaimIssueType(readIssueType(claim)),
    photoCount: Array.isArray(claim.images) ? claim.images.length : 0,
    submittedAt: readSubmittedAt(claim),
    workflowState: toApiClaimWorkflowState(readState(claim)),
    status: toUiClaimStatus(readState(claim)),
    priority: 'normal',
    phone: readRegistrationPhone(claim),
    city: readCity(claim),
    areaSqFt: asNumber(readAffectedArea(claim)),
    topcoat: readTopcoatName(claim),
    batchNumber: UNKNOWN_VALUE,
    description: asString(claim.notes, 'No description provided.'),
    evidencePhotos: (claim.images ?? []).reduce<ClaimDetail['evidencePhotos']>((photos, image) => {
      const imageAsset = image.image as { image?: unknown; url?: unknown } | undefined;
      const url =
        (typeof imageAsset?.image === 'string' && imageAsset.image.trim().length > 0 ? imageAsset.image : null) ??
        (typeof imageAsset?.url === 'string' && imageAsset.url.trim().length > 0 ? imageAsset.url : null);
      if (typeof url !== 'string' || url.trim().length === 0) {
        return photos;
      }
      photos.push({
        id: String(image.id),
        label: readEvidencePhotoLabel(image, photos.length + 1),
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
      customerName: readRegistrationCustomerName(claim),
      purchaseDate: readRegistrationPurchaseDate(claim),
      dealerName: readRegistrationDealer(claim),
      status: readRegistrationState(claim),
    },
    csNotes: claim.notes || undefined,
    forwardedBy: claim.approved_by ?? undefined,
    forwardedAt: claim.approved_at ?? undefined,
  });
