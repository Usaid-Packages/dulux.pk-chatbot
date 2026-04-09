import { GET, apiEndpoints } from '#/constants';
import { performRequest } from '#/services/apiClient';
import type { QualityQueueRequestParams, QualityQueueResponse } from '#/types/quality.types';
import type { PaginatedApiResponse, WarrantyClaimApiResponse } from '../apiMappers';
import { getQualityListQueryParams, mapQualityQueueResponse } from '../apiMappers';

const DEFAULT_PARAMS: QualityQueueRequestParams = {
  status: 'all',
  page: 1,
  pageSize: 10,
};

export const getQualityQueue = async (params?: Partial<QualityQueueRequestParams>): Promise<QualityQueueResponse> => {
  const filters: QualityQueueRequestParams = { ...DEFAULT_PARAMS, ...params };
  const requestParams = getQualityListQueryParams(filters);

  const queueResponse = await performRequest<
    PaginatedApiResponse<WarrantyClaimApiResponse>,
    undefined,
    Record<string, string | number>
  >({
    method: GET,
    url: apiEndpoints.quality.list,
    params: requestParams,
  });

  const queueResults = queueResponse.results ?? [];
  const awaitingReview = queueResults.filter(item => (item.state ?? '').toUpperCase() === 'QA_REVIEW').length;
  const infoRequested = queueResults.filter(item => (item.state ?? '').toUpperCase() === 'RESUBMIT').length;
  const resolvedToday = queueResults.filter(item => {
    const normalizedState = (item.state ?? '').toUpperCase();
    return normalizedState === 'QA_APPROVED' || normalizedState === 'QA_REJECTED' || normalizedState === 'QA_REJECT';
  }).length;

  return mapQualityQueueResponse({
    response: queueResponse,
    filters,
    stats: {
      totalInQueue: queueResponse.count ?? queueResults.length,
      awaitingReview,
      infoRequested,
      resolvedToday,
    },
  });
};
