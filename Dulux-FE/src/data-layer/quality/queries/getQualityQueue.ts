/* eslint import/order: off */
import { GET, apiEndpoints } from '#/constants';
import { performRequest } from '#/services/apiClient';
import type { QualityQueueRequestParams, QualityQueueResponse } from '#/types/quality.types';

import type { PaginatedApiResponse, WarrantyClaimApiResponse } from '../apiMappers';
import { countFromResponse, getQualityListQueryParams, mapQualityQueueResponse } from '../apiMappers';

const DEFAULT_PARAMS: QualityQueueRequestParams = {
  status: 'all',
  page: 1,
  pageSize: 10,
};

export const getQualityQueue = async (params?: Partial<QualityQueueRequestParams>): Promise<QualityQueueResponse> => {
  const filters: QualityQueueRequestParams = { ...DEFAULT_PARAMS, ...params };
  const requestParams = getQualityListQueryParams(filters);

  const [queueResponse, allResponse, awaitingResponse, infoRequestedResponse, approvedResponse, rejectedResponse] =
    await Promise.all([
      performRequest<PaginatedApiResponse<WarrantyClaimApiResponse>, undefined, Record<string, string | number>>({
        method: GET,
        url: apiEndpoints.quality.list,
        params: requestParams,
      }),
      performRequest<PaginatedApiResponse<unknown>, undefined, Record<string, string | number>>({
        method: GET,
        url: apiEndpoints.quality.list,
        params: { page: 1, pageSize: 1 },
      }),
      performRequest<PaginatedApiResponse<unknown>, undefined, Record<string, string | number>>({
        method: GET,
        url: apiEndpoints.quality.list,
        params: { state: 'QA_REVIEW', page: 1, pageSize: 1 },
      }),
      performRequest<PaginatedApiResponse<unknown>, undefined, Record<string, string | number>>({
        method: GET,
        url: apiEndpoints.quality.list,
        params: { state: 'RESUBMIT', page: 1, pageSize: 1 },
      }),
      performRequest<PaginatedApiResponse<unknown>, undefined, Record<string, string | number>>({
        method: GET,
        url: apiEndpoints.quality.list,
        params: { state: 'APPROVED', page: 1, pageSize: 1 },
      }),
      performRequest<PaginatedApiResponse<unknown>, undefined, Record<string, string | number>>({
        method: GET,
        url: apiEndpoints.quality.list,
        params: { state: 'REJECTED', page: 1, pageSize: 1 },
      }),
    ]);

  return mapQualityQueueResponse({
    response: queueResponse,
    filters,
    stats: {
      totalInQueue: countFromResponse(allResponse),
      awaitingReview: countFromResponse(awaitingResponse),
      infoRequested: countFromResponse(infoRequestedResponse),
      resolvedToday: countFromResponse(approvedResponse) + countFromResponse(rejectedResponse),
    },
  });
};
