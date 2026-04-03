/* eslint import/order: off */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { conversationThreadSchema } from '#/schemas/complaints.schema';
import { performRequest } from '#/services/apiClient';
import type { ConversationThread, SendMessagePayload } from '#/types/complaints';
import { sendMockMessage } from '../mockComplaintsStore';
import { isNetworkError, shouldUseMockComplaints } from '../transport';

export const sendConversationMessage = async (payload: SendMessagePayload): Promise<ConversationThread> => {
  try {
    const response = await performRequest<ConversationThread, SendMessagePayload>({
      method: POST,
      url: apiEndpoints.complaints.sendMessage(payload.threadId),
      payload,
    });

    return conversationThreadSchema.parse(response);
  } catch (error) {
    if (shouldUseMockComplaints() && isNetworkError(error)) {
      return conversationThreadSchema.parse(sendMockMessage(payload));
    }

    throw error;
  }
};

export const useSendConversationMessageMutation = (): UseMutationResult<
  ConversationThread,
  Error,
  SendMessagePayload
> => {
  const queryClient = useQueryClient();

  return useMutation<ConversationThread, Error, SendMessagePayload>({
    mutationKey: queryKeys.complaints.sendMessage,
    mutationFn: sendConversationMessage,
    onSuccess: updatedThread => {
      queryClient.setQueryData(queryKeys.complaints.detail(updatedThread.id), updatedThread);
      void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all });
    },
  });
};
