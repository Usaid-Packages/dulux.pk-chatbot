import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { claimDetailSchema } from '#/schemas/claim.schema';
import { performRequest } from '#/services/apiClient';
import type { ClaimDetail, RequestMoreInfoPayload } from '#/types/claims.types';
import { requestMockClaimInfo } from '../mockClaimsStore';
import { isNetworkError, shouldUseMockClaims } from '../transport';

export const requestMoreInfoClaim = async (payload: RequestMoreInfoPayload): Promise<ClaimDetail> => {
  try {
    const response = await performRequest<ClaimDetail, RequestMoreInfoPayload>({
      method: POST,
      url: apiEndpoints.claims.requestInfo(payload.id),
      payload,
    });

    return claimDetailSchema.parse(response);
  } catch (error) {
    if (shouldUseMockClaims() && isNetworkError(error)) {
      return claimDetailSchema.parse(requestMockClaimInfo(payload));
    }
    throw error;
  }
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
