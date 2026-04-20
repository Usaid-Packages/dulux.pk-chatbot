import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '#/constants';
import { getClaimCsrResubmissionRequest } from '#/data-layer/claims';
import type { ClaimCsrResubmissionRequest } from '#/types/claims.types';

/**
 * useClaimCsrResubmission fetches QA-requested CSR resubmission fields for a claim.
 *
 * @param claimId - Claim identifier used to load the resubmission request.
 * @param isEnabled - Query gate derived from modal visibility.
 * @returns CSR resubmission request query state.
 */
export const useClaimCsrResubmission = (
  claimId: string,
  isEnabled: boolean
): UseQueryResult<ClaimCsrResubmissionRequest, Error> => {
  return useQuery<ClaimCsrResubmissionRequest, Error>({
    queryKey: queryKeys.claims.csrResubmissionRequest(claimId),
    queryFn: () => getClaimCsrResubmissionRequest(claimId),
    enabled: isEnabled && claimId.length > 0,
  });
};
