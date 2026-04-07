/* eslint import/order: off */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services/apiClient';
import type { QualityDetail, QualityRequestInfoPayload } from '#/types/quality.types';

import type { WarrantyClaimApiResponse } from '../apiMappers';
import { mapQualityClaimDetail } from '../apiMappers';

export const requestMoreInfoQuality = async (payload: QualityRequestInfoPayload): Promise<QualityDetail> => {
  const itemsList = payload.items.join(', ');
  const notes = [
    `Requested From: ${payload.requestFrom === 'cs_agent' ? 'CS Agent' : 'Customer'}`,
    `Missing Items: ${itemsList}`,
    payload.notes ? `Notes: ${payload.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await performRequest<WarrantyClaimApiResponse, { action: 'RESUBMIT'; notes: string }>({
    method: 'patch',
    url: apiEndpoints.quality.requestInfo(payload.id),
    payload: {
      action: 'RESUBMIT',
      notes,
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
