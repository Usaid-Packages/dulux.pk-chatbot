import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { PATCH, apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services/apiClient';
import type { ApiClaimDetail, RequestMoreInfoClaimRequestPayload } from '#/types/claims.api.types';
import type { ClaimDetail, RequestMoreInfoPayload } from '#/types/claims.types';
import { normalizeClaimDetail } from '../normalizers';
import { toRequestMoreInfoNotes } from '../payloadHelpers';

export const requestMoreInfoClaim = async (payload: RequestMoreInfoPayload): Promise<ClaimDetail> => {
  const requestPayload: RequestMoreInfoClaimRequestPayload = {
    action: 'RESUBMIT',
    notes: toRequestMoreInfoNotes(payload),
  };

  const response = await performRequest<ApiClaimDetail, RequestMoreInfoClaimRequestPayload>({
    method: PATCH,
    url: apiEndpoints.claims.detail(payload.id),
    payload: requestPayload,
  });

  return normalizeClaimDetail(response);
};

export const useRequestMoreInfoClaimMutation = (): UseMutationResult<ClaimDetail, Error, RequestMoreInfoPayload> => {
  const queryClient = useQueryClient();

  return useMutation<ClaimDetail, Error, RequestMoreInfoPayload>({
    mutationKey: queryKeys.claims.requestInfo,
    mutationFn: requestMoreInfoClaim,
    onSuccess: updatedClaim => {
      queryClient.setQueryData(queryKeys.claims.detail(updatedClaim.id), updatedClaim);
      void queryClient.invalidateQueries({ queryKey: queryKeys.claims.all });
    },
  });
};
