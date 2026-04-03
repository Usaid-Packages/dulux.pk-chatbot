import { GET, apiEndpoints } from '#/constants';
import { claimsListResponseSchema } from '#/schemas/claim.schema';
import { performRequest } from '#/services/apiClient';
import type { ClaimsListRequestParams, ClaimsListResponse } from '#/types/claims.types';
import { getMockClaims } from '../mockClaimsStore';
import { isNetworkError, shouldUseMockClaims } from '../transport';

const DEFAULT_LIST_PARAMS: ClaimsListRequestParams = {
  status: 'all',
  issueType: 'all',
  page: 1,
  pageSize: 10,
};

export const getClaims = async (params?: Partial<ClaimsListRequestParams>): Promise<ClaimsListResponse> => {
  const requestParams = { ...DEFAULT_LIST_PARAMS, ...params };

  try {
    const response = await performRequest<ClaimsListResponse, undefined, ClaimsListRequestParams>({
      method: GET,
      url: apiEndpoints.claims.list,
      params: requestParams,
    });

    return claimsListResponseSchema.parse(response);
  } catch (error) {
    if (shouldUseMockClaims() && isNetworkError(error)) {
      return claimsListResponseSchema.parse(getMockClaims(requestParams));
    }
    throw error;
  }
};
