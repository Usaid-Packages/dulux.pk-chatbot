import { GET, apiEndpoints } from '#/constants';
import { performRequest } from '#/services/apiClient';
import type { ApiClaimDetail } from '#/types/claims.api.types';
import type { ClaimDetail } from '#/types/claims.types';
import { normalizeClaimDetail } from '../normalizers';

export const getClaimById = async (id: string): Promise<ClaimDetail> => {
  const response = await performRequest<ApiClaimDetail>({
    method: GET,
    url: apiEndpoints.claims.detail(id),
  });

  return normalizeClaimDetail(response);
};
