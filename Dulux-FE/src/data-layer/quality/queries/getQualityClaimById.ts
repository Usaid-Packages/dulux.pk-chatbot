/* eslint import/order: off */
import { GET, apiEndpoints } from '#/constants';
import { getMockQualityClaimById } from '#/data-layer/claims/mockClaimsStore';
import { qualityDetailSchema } from '#/schemas/quality.schema';
import { performRequest } from '#/services/apiClient';
import type { QualityDetail } from '#/types/quality.types';

import { isNetworkError, shouldUseMockQuality } from '../transport';

export const getQualityClaimById = async (id: string): Promise<QualityDetail> => {
  try {
    const response = await performRequest<QualityDetail>({
      method: GET,
      url: apiEndpoints.quality.detail(id),
    });

    return qualityDetailSchema.parse(response);
  } catch (error) {
    if (shouldUseMockQuality() && isNetworkError(error)) {
      return qualityDetailSchema.parse(getMockQualityClaimById(id));
    }
    throw error;
  }
};
