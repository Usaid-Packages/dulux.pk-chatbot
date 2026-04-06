import { GET, apiEndpoints } from '#/constants';
import { qualityQueueResponseSchema } from '#/schemas/quality.schema';
import { performRequest } from '#/services/apiClient';
import type { QualityQueueRequestParams, QualityQueueResponse } from '#/types/quality.types';

const DEFAULT_PARAMS: QualityQueueRequestParams = {
  status: 'all',
  page: 1,
  pageSize: 10,
};

export const getQualityQueue = async (params?: Partial<QualityQueueRequestParams>): Promise<QualityQueueResponse> => {
  const requestParams = { ...DEFAULT_PARAMS, ...params };

  const response = await performRequest<QualityQueueResponse, undefined, QualityQueueRequestParams>({
    method: GET,
    url: apiEndpoints.quality.list,
    params: requestParams,
  });

  return qualityQueueResponseSchema.parse(response);
};
