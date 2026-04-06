import { GET, apiEndpoints } from '#/constants';
import { qualityDetailSchema } from '#/schemas/quality.schema';
import { performRequest } from '#/services/apiClient';
import type { QualityDetail } from '#/types/quality.types';

export const getQualityClaimById = async (id: string): Promise<QualityDetail> => {
  const response = await performRequest<QualityDetail>({
    method: GET,
    url: apiEndpoints.quality.detail(id),
  });

  return qualityDetailSchema.parse(response);
};
