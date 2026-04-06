import { GET, apiEndpoints, toClaimsIssueTypeFilter, toClaimsStateFilter } from '#/constants';
import { claimsListResponseSchema } from '#/schemas/claim.schema';
import { performRequest } from '#/services/apiClient';
import type { ClaimsListApiQuery, ClaimsListApiResponse } from '#/types/claims.api.types';
import type { ClaimsListRequestParams, ClaimsListResponse } from '#/types/claims.types';
import { normalizeClaimsListResponse } from '../normalizers';

const DEFAULT_LIST_PARAMS: ClaimsListRequestParams = {
  status: 'all',
  issueType: 'all',
  page: 1,
  pageSize: 10,
};

export const getClaims = async (params?: Partial<ClaimsListRequestParams>): Promise<ClaimsListResponse> => {
  const requestParams = { ...DEFAULT_LIST_PARAMS, ...params };
  const state = toClaimsStateFilter(requestParams.status);
  const issueType = toClaimsIssueTypeFilter(requestParams.issueType);

  const query: ClaimsListApiQuery = {
    page: requestParams.page,
    page_size: requestParams.pageSize,
  };

  if (state) {
    query.state = state;
  }
  if (issueType) {
    query.issue_type = issueType;
  }
  if (requestParams.search) {
    query.search = requestParams.search;
  }

  const response = await performRequest<ClaimsListApiResponse, undefined, ClaimsListApiQuery>({
    method: GET,
    url: apiEndpoints.claims.list,
    params: query,
  });

  return claimsListResponseSchema.parse(
    normalizeClaimsListResponse(response, requestParams.page, requestParams.pageSize)
  );
};
