import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { qualityDetailSchema } from '#/schemas/quality.schema';
import { performRequest } from '#/services/apiClient';
import type { QualityDetail, QualityRejectPayload } from '#/types/quality.types';

export const rejectQualityClaim = async (payload: QualityRejectPayload): Promise<QualityDetail> => {
  const response = await performRequest<QualityDetail, QualityRejectPayload>({
    method: POST,
    url: apiEndpoints.quality.reject(payload.id),
    payload,
  });

  return qualityDetailSchema.parse(response);
};

export const useRejectQualityClaimMutation = (): UseMutationResult<QualityDetail, Error, QualityRejectPayload> => {
  const queryClient = useQueryClient();

  return useMutation<QualityDetail, Error, QualityRejectPayload>({
    mutationKey: queryKeys.quality.reject,
    mutationFn: rejectQualityClaim,
    onSuccess: updatedClaim => {
      queryClient.setQueryData(queryKeys.quality.detail(updatedClaim.id), updatedClaim);
      queryClient.setQueryData(queryKeys.claims.detail(updatedClaim.id), updatedClaim);
      void queryClient.invalidateQueries({ queryKey: queryKeys.quality.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.claims.all });
    },
  });
};
