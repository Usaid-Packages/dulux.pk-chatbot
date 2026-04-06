/* eslint import/order: off */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services/apiClient';
import type { QualityApprovePayload, QualityDetail } from '#/types/quality.types';

import type { WarrantyClaimApiResponse } from '../apiMappers';
import { mapQualityClaimDetail } from '../apiMappers';

export const approveQualityClaim = async (payload: QualityApprovePayload): Promise<QualityDetail> => {
  const mergedNotes = payload.notes
    ? `Assessment: ${payload.assessment}\n\n${payload.notes}`
    : `Assessment: ${payload.assessment}`;

  const response = await performRequest<WarrantyClaimApiResponse, { action: 'APPROVE'; notes: string }>({
    method: 'patch',
    url: apiEndpoints.quality.approve(payload.id),
    payload: {
      action: 'APPROVE',
      notes: mergedNotes,
    },
  });

  return mapQualityClaimDetail(response);
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
