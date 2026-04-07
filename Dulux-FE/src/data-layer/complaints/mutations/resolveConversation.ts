import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { PATCH, apiEndpoints, queryKeys } from '#/constants';
import { conversationThreadSchema } from '#/schemas/complaints.schema';
import { performRequest } from '#/services/apiClient';
import { COMPLAINT_ACTIONS } from '#/types/complaints';
import type { ComplaintDetailApiResponse, ConversationThread, ResolveConversationPayload } from '#/types/complaints';
import { normalizeComplaintDetailResponse } from '#/utils';

interface ComplaintActionRequestPayload {
  action: string;
}

export const resolveConversation = async (payload: ResolveConversationPayload): Promise<ConversationThread> => {
  const response = await performRequest<ComplaintDetailApiResponse, ComplaintActionRequestPayload>({
    method: PATCH,
    url: apiEndpoints.complaints.detail(payload.threadId),
    payload: {
      action: COMPLAINT_ACTIONS.RESOLVE,
    },
  });

  const normalizedResponse = normalizeComplaintDetailResponse(response);
  return conversationThreadSchema.parse(normalizedResponse);
};

export const useResolveConversationMutation = (): UseMutationResult<
  ConversationThread,
  Error,
  ResolveConversationPayload
> => {
  const queryClient = useQueryClient();

  return useMutation<ConversationThread, Error, ResolveConversationPayload>({
    mutationKey: queryKeys.complaints.resolve,
    mutationFn: resolveConversation,
    onSuccess: updatedThread => {
      queryClient.setQueryData(queryKeys.complaints.detail(updatedThread.id), updatedThread);
      void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all });
    },
  });
};
