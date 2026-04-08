import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services/apiClient';
import type { QualityDetail, QualityRejectPayload } from '#/types/quality.types';
import type { WarrantyClaimApiResponse } from '../apiMappers';
import { mapQualityClaimDetail } from '../apiMappers';

export const rejectQualityClaim = async (payload: QualityRejectPayload): Promise<QualityDetail> => {
  const response = await performRequest<
    WarrantyClaimApiResponse,
    { technical_reason: string; technical_notes: string; notification_template: string }
  >({
    method: POST,
    url: apiEndpoints.quality.reject(payload.id),
    payload: {
      technical_reason: payload.technicalReason,
      technical_notes: payload.technicalNotes,
      notification_template: payload.notificationTemplate,
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
