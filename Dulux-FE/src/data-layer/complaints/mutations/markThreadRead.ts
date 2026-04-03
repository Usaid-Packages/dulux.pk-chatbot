/* eslint import/order: off */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { conversationThreadSchema } from '#/schemas/complaints.schema';
import { performRequest } from '#/services/apiClient';
import type { ConversationThread, MarkThreadReadPayload } from '#/types/complaints';
import { markMockThreadAsRead } from '../mockComplaintsStore';
import { isNetworkError, shouldUseMockComplaints } from '../transport';

export const markConversationThreadRead = async (payload: MarkThreadReadPayload): Promise<ConversationThread> => {
  try {
    const response = await performRequest<ConversationThread, MarkThreadReadPayload>({
      method: POST,
      url: apiEndpoints.complaints.markRead(payload.threadId),
      payload,
    });

    return conversationThreadSchema.parse(response);
  } catch (error) {
    if (shouldUseMockComplaints() && isNetworkError(error)) {
      return conversationThreadSchema.parse(markMockThreadAsRead(payload));
    }

    throw error;
  }
};

export const useMarkConversationReadMutation = (): UseMutationResult<
  ConversationThread,
  Error,
  MarkThreadReadPayload
> => {
  const queryClient = useQueryClient();

  return useMutation<ConversationThread, Error, MarkThreadReadPayload>({
    mutationKey: queryKeys.complaints.markRead,
    mutationFn: markConversationThreadRead,
    onSuccess: updatedThread => {
      queryClient.setQueryData(queryKeys.complaints.detail(updatedThread.id), updatedThread);
      void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all });
    },
  });
};
