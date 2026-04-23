import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services/apiClient';
import type { QualityDetail, QualityRequestInfoPayload } from '#/types/quality.types';
import type { WarrantyClaimApiResponse } from '../apiMappers';
import { mapQualityClaimDetail } from '../apiMappers';

export const requestMoreInfoQuality = async (payload: QualityRequestInfoPayload): Promise<QualityDetail> => {
  const response = await performRequest<
    WarrantyClaimApiResponse,
    {
      required_items: string[];
      notes?: string;
    }
  >({
    method: POST,
    url: apiEndpoints.quality.requestInfo(payload.id),
    payload: {
      required_items: payload.requiredItems,
      notes: payload.notes,
    },
  });

  return mapQualityClaimDetail(response);
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
