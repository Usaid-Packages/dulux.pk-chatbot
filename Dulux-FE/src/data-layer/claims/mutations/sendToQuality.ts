import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { claimDetailSchema } from '#/schemas/claim.schema';
import { performRequest } from '#/services/apiClient';
import type { ClaimDetail, SendToQualityPayload } from '#/types/claims.types';
import { sendMockClaimToQuality } from '../mockClaimsStore';
import { isNetworkError, shouldUseMockClaims } from '../transport';

export const sendToQuality = async (payload: SendToQualityPayload): Promise<ClaimDetail> => {
  try {
    const response = await performRequest<ClaimDetail, SendToQualityPayload>({
      method: POST,
      url: apiEndpoints.claims.sendToQuality(payload.id),
      payload,
    });

    return claimDetailSchema.parse(response);
  } catch (error) {
    if (shouldUseMockClaims() && isNetworkError(error)) {
      return claimDetailSchema.parse(sendMockClaimToQuality(payload));
    }
    throw error;
  }
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
