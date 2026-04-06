import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { conversationThreadSchema } from '#/schemas/complaints.schema';
import { performRequest } from '#/services/apiClient';
import type { ConversationThread, EscalateConversationPayload } from '#/types/complaints';
import { escalateMockConversation } from '../mockComplaintsStore';
import { isNetworkError, shouldUseMockComplaints } from '../transport';

export const escalateConversation = async (payload: EscalateConversationPayload): Promise<ConversationThread> => {
  try {
    const response = await performRequest<ConversationThread, EscalateConversationPayload>({
      method: POST,
      url: apiEndpoints.complaints.escalate(payload.threadId),
      payload,
    });

    return conversationThreadSchema.parse(response);
  } catch (error) {
    if (shouldUseMockComplaints() && isNetworkError(error)) {
      return conversationThreadSchema.parse(escalateMockConversation(payload));
    }

    throw error;
  }
};

export const useEscalateConversationMutation = (): UseMutationResult<
  ConversationThread,
  Error,
  EscalateConversationPayload
> => {
  const queryClient = useQueryClient();

  return useMutation<ConversationThread, Error, EscalateConversationPayload>({
    mutationKey: queryKeys.complaints.escalate,
    mutationFn: escalateConversation,
    onSuccess: updatedThread => {
      queryClient.setQueryData(queryKeys.complaints.detail(updatedThread.id), updatedThread);
      void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all });
    },
  });
};
