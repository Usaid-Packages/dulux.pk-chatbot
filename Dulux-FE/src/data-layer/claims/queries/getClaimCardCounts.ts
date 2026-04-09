import { GET, apiEndpoints } from '#/constants';
import { claimsCardCountsSchema } from '#/schemas/claim.schema';
import { performRequest } from '#/services/apiClient';
import type { ClaimsCardCounts } from '#/types/claims.types';

export const getClaimCardCounts = async (): Promise<ClaimsCardCounts> => {
  const response = await performRequest<ClaimsCardCounts>({
    method: GET,
    url: apiEndpoints.claims.cardCounts,
  });

  return claimsCardCountsSchema.parse(response);
};
