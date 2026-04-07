/* eslint import/order: off */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services/apiClient';
import type { QualityDetail, QualityRejectPayload } from '#/types/quality.types';

import type { WarrantyClaimApiResponse } from '../apiMappers';
import { mapQualityClaimDetail } from '../apiMappers';

export const rejectQualityClaim = async (payload: QualityRejectPayload): Promise<QualityDetail> => {
  const response = await performRequest<WarrantyClaimApiResponse, { action: 'REJECT'; notes: string }>({
    method: 'patch',
    url: apiEndpoints.quality.reject(payload.id),
    payload: {
      action: 'REJECT',
      notes: `Reason: ${payload.reason}\n\nTechnical Notes: ${payload.technicalNotes}`,
    },
  });

  return mapQualityClaimDetail(response);
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
