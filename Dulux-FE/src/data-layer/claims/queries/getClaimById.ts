import { GET, apiEndpoints } from '#/constants';
import { claimDetailSchema } from '#/schemas/claim.schema';
import { performRequest } from '#/services/apiClient';
import type { ClaimDetail } from '#/types/claims.types';
import { getMockClaimById } from '../mockClaimsStore';
import { isNetworkError, shouldUseMockClaims } from '../transport';

export const getClaimById = async (id: string): Promise<ClaimDetail> => {
  try {
    const response = await performRequest<ClaimDetail>({
      method: GET,
      url: apiEndpoints.claims.detail(id),
    });

    return claimDetailSchema.parse(response);
  } catch (error) {
    if (shouldUseMockClaims() && isNetworkError(error)) {
      return claimDetailSchema.parse(getMockClaimById(id));
    }
    throw error;
  }
};
