import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { qualityDetailSchema } from '#/schemas/quality.schema';
import { performRequest } from '#/services/apiClient';
import type { QualityApprovePayload, QualityDetail } from '#/types/quality.types';

export const approveQualityClaim = async (payload: QualityApprovePayload): Promise<QualityDetail> => {
  const response = await performRequest<QualityDetail, QualityApprovePayload>({
    method: POST,
    url: apiEndpoints.quality.approve(payload.id),
    payload,
  });

  return qualityDetailSchema.parse(response);
};

export const useApproveQualityClaimMutation = (): UseMutationResult<QualityDetail, Error, QualityApprovePayload> => {
  const queryClient = useQueryClient();

  return useMutation<QualityDetail, Error, QualityApprovePayload>({
    mutationKey: queryKeys.quality.approve,
    mutationFn: approveQualityClaim,
    onSuccess: updatedClaim => {
      queryClient.setQueryData(queryKeys.quality.detail(updatedClaim.id), updatedClaim);
      queryClient.setQueryData(queryKeys.claims.detail(updatedClaim.id), updatedClaim);
      void queryClient.invalidateQueries({ queryKey: queryKeys.quality.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.claims.all });
    },
  });
};
