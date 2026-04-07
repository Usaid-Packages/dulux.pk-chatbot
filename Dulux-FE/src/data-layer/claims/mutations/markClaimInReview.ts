import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { CLAIM_ACTIONS, PATCH, apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services/apiClient';
import type { MarkClaimInReviewRequestPayload } from '#/types/claims.api.types';
import type { ClaimDetail, MarkClaimInReviewPayload } from '#/types/claims.types';

export const markClaimInReview = async (payload: MarkClaimInReviewPayload): Promise<void> => {
  const requestPayload: MarkClaimInReviewRequestPayload = {
    action: CLAIM_ACTIONS.IN_REVIEW,
  };

  await performRequest<unknown, MarkClaimInReviewRequestPayload>({
    method: PATCH,
    url: apiEndpoints.claims.detail(payload.id),
    payload: requestPayload,
  });
};

export const useMarkClaimInReviewMutation = (): UseMutationResult<void, Error, MarkClaimInReviewPayload> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, MarkClaimInReviewPayload>({
    mutationKey: queryKeys.claims.markInReview,
    mutationFn: markClaimInReview,
    onSuccess: (_data, variables) => {
      queryClient.setQueryData<ClaimDetail | undefined>(queryKeys.claims.detail(variables.id), previousClaim => {
        if (!previousClaim) {
          return previousClaim;
        }
        return {
          ...previousClaim,
          workflowState: 'IN_REVIEW',
          status: 'pending',
        };
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.claims.detail(variables.id) });
      void queryClient.refetchQueries({ queryKey: queryKeys.claims.detail(variables.id), exact: true });
      void queryClient.invalidateQueries({ queryKey: queryKeys.claims.all });
    },
  });
};
