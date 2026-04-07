/* eslint import/order: off */
import { GET, apiEndpoints } from '#/constants';
import { performRequest } from '#/services/apiClient';
import type { QualityDetail } from '#/types/quality.types';

import type { WarrantyClaimApiResponse } from '../apiMappers';
import { mapQualityClaimDetail } from '../apiMappers';

export const getQualityClaimById = async (id: string): Promise<QualityDetail> => {
  const response = await performRequest<WarrantyClaimApiResponse>({
    method: GET,
    url: apiEndpoints.quality.detail(id),
  });

  return mapQualityClaimDetail(response);
};
