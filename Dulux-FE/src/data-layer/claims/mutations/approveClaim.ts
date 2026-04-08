import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { PATCH, apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services/apiClient';
import type { ApiClaimDetail } from '#/types/claims.api.types';
import type { ApproveClaimPayload, ClaimDetail } from '#/types/claims.types';
import { normalizeClaimDetail } from '../normalizers';

export const approveClaim = async (payload: ApproveClaimPayload): Promise<ClaimDetail> => {
  const requestPayload = new FormData();
  requestPayload.append('action', 'APPROVE');
  requestPayload.append('notification_template', payload.notificationTemplate ?? '');
  requestPayload.append('voucher', payload.voucher);
  if (payload.notes) {
    requestPayload.append('notes', payload.notes);
  }

  const response = await performRequest<ApiClaimDetail, FormData>({
    method: PATCH,
    url: apiEndpoints.claims.detail(payload.id),
    payload: requestPayload,
  });

  return normalizeClaimDetail(response);
};

export const useApproveClaimMutation = (): UseMutationResult<ClaimDetail, Error, ApproveClaimPayload> => {
  const queryClient = useQueryClient();

  return useMutation<ClaimDetail, Error, ApproveClaimPayload>({
    mutationKey: queryKeys.claims.approve,
    mutationFn: approveClaim,
    onSuccess: updatedClaim => {
      queryClient.setQueryData(queryKeys.claims.detail(updatedClaim.id), updatedClaim);
      void queryClient.invalidateQueries({ queryKey: queryKeys.claims.all });
    },
  });
};
