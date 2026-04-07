import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { PATCH, apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services/apiClient';
import type { ApiClaimDetail, SendToQualityRequestPayload } from '#/types/claims.api.types';
import type { ClaimDetail, SendToQualityPayload } from '#/types/claims.types';
import { normalizeClaimDetail } from '../normalizers';
import { toSendToQualityNotes } from '../payloadHelpers';

export const sendToQuality = async (payload: SendToQualityPayload): Promise<ClaimDetail> => {
  const requestPayload: SendToQualityRequestPayload = {
    action: 'QA_REVIEW',
    notes: toSendToQualityNotes(payload),
  };

  const response = await performRequest<ApiClaimDetail, SendToQualityRequestPayload>({
    method: PATCH,
    url: apiEndpoints.claims.detail(payload.id),
    payload: requestPayload,
  });

  return normalizeClaimDetail(response);
};

export const useSendToQualityMutation = (): UseMutationResult<ClaimDetail, Error, SendToQualityPayload> => {
  const queryClient = useQueryClient();

  return useMutation<ClaimDetail, Error, SendToQualityPayload>({
    mutationKey: queryKeys.claims.sendToQuality,
    mutationFn: sendToQuality,
    onSuccess: updatedClaim => {
      queryClient.setQueryData(queryKeys.claims.detail(updatedClaim.id), updatedClaim);
      void queryClient.invalidateQueries({ queryKey: queryKeys.claims.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.quality.all });
    },
  });
};
