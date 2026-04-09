import { GET, apiEndpoints } from '#/constants';
import { qualityCardCountsSchema } from '#/schemas/quality.schema';
import { performRequest } from '#/services/apiClient';
import type { QualityCardCounts } from '#/types/quality.types';

export const getQualityCardCounts = async (): Promise<QualityCardCounts> => {
  const response = await performRequest<QualityCardCounts>({
    method: GET,
    url: apiEndpoints.quality.cardCounts,
  });

  return qualityCardCountsSchema.parse(response);
};
