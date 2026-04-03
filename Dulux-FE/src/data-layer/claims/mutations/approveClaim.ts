import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { claimDetailSchema } from '#/schemas/claim.schema';
import { performRequest } from '#/services/apiClient';
import type { ApproveClaimPayload, ClaimDetail } from '#/types/claims.types';
import { approveMockClaim } from '../mockClaimsStore';
import { isNetworkError, shouldUseMockClaims } from '../transport';

export const approveClaim = async (payload: ApproveClaimPayload): Promise<ClaimDetail> => {
  try {
    const response = await performRequest<ClaimDetail, ApproveClaimPayload>({
      method: POST,
      url: apiEndpoints.claims.approve(payload.id),
      payload,
    });

    return claimDetailSchema.parse(response);
  } catch (error) {
    if (shouldUseMockClaims() && isNetworkError(error)) {
      return claimDetailSchema.parse(approveMockClaim(payload));
    }
    throw error;
  }
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
