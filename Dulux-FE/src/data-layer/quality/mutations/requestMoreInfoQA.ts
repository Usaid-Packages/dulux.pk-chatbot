/* eslint import/order: off */
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { requestMockQualityInfo } from '#/data-layer/claims/mockClaimsStore';
import { qualityDetailSchema } from '#/schemas/quality.schema';
import { performRequest } from '#/services/apiClient';
import type { QualityDetail, QualityRequestInfoPayload } from '#/types/quality.types';

import { isNetworkError, shouldUseMockQuality } from '../transport';

export const requestMoreInfoQuality = async (payload: QualityRequestInfoPayload): Promise<QualityDetail> => {
  try {
    const response = await performRequest<QualityDetail, QualityRequestInfoPayload>({
      method: POST,
      url: apiEndpoints.quality.requestInfo(payload.id),
      payload,
    });

    return qualityDetailSchema.parse(response);
  } catch (error) {
    if (shouldUseMockQuality() && isNetworkError(error)) {
      return qualityDetailSchema.parse(requestMockQualityInfo(payload));
    }
    throw error;
  }
};

export const useRequestMoreInfoQAMutation = (): UseMutationResult<QualityDetail, Error, QualityRequestInfoPayload> => {
  const queryClient = useQueryClient();

  return useMutation<QualityDetail, Error, QualityRequestInfoPayload>({
    mutationKey: queryKeys.quality.requestInfo,
    mutationFn: requestMoreInfoQuality,
    onSuccess: updatedClaim => {
      queryClient.setQueryData(queryKeys.quality.detail(updatedClaim.id), updatedClaim);
      queryClient.setQueryData(queryKeys.claims.detail(updatedClaim.id), updatedClaim);
      void queryClient.invalidateQueries({ queryKey: queryKeys.quality.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.claims.all });
    },
  });
};
