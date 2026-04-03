/* eslint import/order: off */
import { GET, apiEndpoints } from '#/constants';
import { getMockQualityQueue } from '#/data-layer/claims/mockClaimsStore';
import { qualityQueueResponseSchema } from '#/schemas/quality.schema';
import { performRequest } from '#/services/apiClient';
import type { QualityQueueRequestParams, QualityQueueResponse } from '#/types/quality.types';

import { isNetworkError, shouldUseMockQuality } from '../transport';

const DEFAULT_PARAMS: QualityQueueRequestParams = {
  status: 'all',
  page: 1,
  pageSize: 10,
};

export const getQualityQueue = async (params?: Partial<QualityQueueRequestParams>): Promise<QualityQueueResponse> => {
  const requestParams = { ...DEFAULT_PARAMS, ...params };

  try {
    const response = await performRequest<QualityQueueResponse, undefined, QualityQueueRequestParams>({
      method: GET,
      url: apiEndpoints.quality.list,
      params: requestParams,
    });

    return qualityQueueResponseSchema.parse(response);
  } catch (error) {
    if (shouldUseMockQuality() && isNetworkError(error)) {
      return qualityQueueResponseSchema.parse(getMockQualityQueue(requestParams));
    }
    throw error;
  }
};
