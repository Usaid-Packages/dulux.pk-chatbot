import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { PATCH, apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services/apiClient';
import type { ApiClaimDetail, RejectClaimRequestPayload } from '#/types/claims.api.types';
import type { ClaimDetail, RejectClaimPayload } from '#/types/claims.types';
import { normalizeClaimDetail } from '../normalizers';
import { toRejectNotes } from '../payloadHelpers';

export const rejectClaim = async (payload: RejectClaimPayload): Promise<ClaimDetail> => {
  const requestPayload: RejectClaimRequestPayload = {
    action: 'REJECT',
    notes: toRejectNotes(payload),
  };

  const response = await performRequest<ApiClaimDetail, RejectClaimRequestPayload>({
    method: PATCH,
    url: apiEndpoints.claims.detail(payload.id),
    payload: requestPayload,
  });

  return normalizeClaimDetail(response);
};

export const useRejectClaimMutation = (): UseMutationResult<ClaimDetail, Error, RejectClaimPayload> => {
  const queryClient = useQueryClient();

  return useMutation<ClaimDetail, Error, RejectClaimPayload>({
    mutationKey: queryKeys.claims.reject,
    mutationFn: rejectClaim,
    onSuccess: updatedClaim => {
      queryClient.setQueryData(queryKeys.claims.detail(updatedClaim.id), updatedClaim);
      void queryClient.invalidateQueries({ queryKey: queryKeys.claims.all });
    },
  });
};
