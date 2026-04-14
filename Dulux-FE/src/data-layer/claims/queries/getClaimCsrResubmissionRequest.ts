import { GET, apiEndpoints } from '#/constants';
import { claimCsrResubmissionRequestSchema } from '#/schemas/claim.schema';
import { performRequest } from '#/services/apiClient';
import type { ApiClaimCsrResubmissionRequestResponse } from '#/types/claims.api.types';
import type { ClaimCsrResubmissionInputType, ClaimCsrResubmissionRequest } from '#/types/claims.types';

const DEFAULT_CSR_INPUT_TYPE: ClaimCsrResubmissionInputType = 'TEXT';

const toInputType = (value: unknown): ClaimCsrResubmissionInputType => {
  if (value === 'IMAGE' || value === 'TEXT') {
    return value;
  }

  return DEFAULT_CSR_INPUT_TYPE;
};

export const getClaimCsrResubmissionRequest = async (id: string): Promise<ClaimCsrResubmissionRequest> => {
  const response = await performRequest<ApiClaimCsrResubmissionRequestResponse>({
    method: GET,
    url: apiEndpoints.claims.csrResubmission(id),
  });

  return claimCsrResubmissionRequestSchema.parse({
    claimId: String(response.claimId ?? response.claim_id ?? id),
    claimState: response.claimState ?? response.claim_state ?? 'RESUBMIT',
    qualityReviewId: String(response.qualityReviewId ?? response.quality_review_id ?? ''),
    qualityNotes: response.qualityNotes ?? response.quality_notes ?? '',
    otherText: response.otherText ?? response.other_text ?? '',
    requestedItems: (response.requestedItems ?? response.requested_items ?? []).map(item => ({
      requiredItem: item.requiredItem ?? item.required_item ?? '',
      label: item.label ?? '',
      inputType: toInputType(item.inputType ?? item.input_type),
      isMultiple: item.isMultiple ?? item.is_multiple ?? false,
    })),
    created: response.created ?? '',
  });
};
