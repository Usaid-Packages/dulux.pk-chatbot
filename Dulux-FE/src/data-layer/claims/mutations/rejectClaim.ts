import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { claimDetailSchema } from '#/schemas/claim.schema';
import { performRequest } from '#/services/apiClient';
import type { ClaimDetail, RejectClaimPayload } from '#/types/claims.types';
import { rejectMockClaim } from '../mockClaimsStore';
import { isNetworkError, shouldUseMockClaims } from '../transport';

export const rejectClaim = async (payload: RejectClaimPayload): Promise<ClaimDetail> => {
  try {
    const response = await performRequest<ClaimDetail, RejectClaimPayload>({
      method: POST,
      url: apiEndpoints.claims.reject(payload.id),
      payload,
    });

    return claimDetailSchema.parse(response);
  } catch (error) {
    if (shouldUseMockClaims() && isNetworkError(error)) {
      return claimDetailSchema.parse(rejectMockClaim(payload));
    }
    throw error;
  }
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
