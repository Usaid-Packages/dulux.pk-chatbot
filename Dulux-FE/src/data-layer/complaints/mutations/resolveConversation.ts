import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { conversationThreadSchema } from '#/schemas/complaints.schema';
import { performRequest } from '#/services/apiClient';
import type { ConversationThread, ResolveConversationPayload } from '#/types/complaints';
import { resolveMockConversation } from '../mockComplaintsStore';
import { isNetworkError, shouldUseMockComplaints } from '../transport';

export const resolveConversation = async (payload: ResolveConversationPayload): Promise<ConversationThread> => {
  try {
    const response = await performRequest<ConversationThread, ResolveConversationPayload>({
      method: POST,
      url: apiEndpoints.complaints.resolve(payload.threadId),
      payload,
    });

    return conversationThreadSchema.parse(response);
  } catch (error) {
    if (shouldUseMockComplaints() && isNetworkError(error)) {
      return conversationThreadSchema.parse(resolveMockConversation(payload));
    }

    throw error;
  }
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
