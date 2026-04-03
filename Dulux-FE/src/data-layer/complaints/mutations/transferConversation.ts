/* eslint import/order: off */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { conversationThreadSchema } from '#/schemas/complaints.schema';
import { performRequest } from '#/services/apiClient';
import type { ConversationThread, TransferConversationPayload } from '#/types/complaints';
import { transferMockConversation } from '../mockComplaintsStore';
import { isNetworkError, shouldUseMockComplaints } from '../transport';

export const transferConversation = async (payload: TransferConversationPayload): Promise<ConversationThread> => {
  try {
    const response = await performRequest<ConversationThread, TransferConversationPayload>({
      method: POST,
      url: apiEndpoints.complaints.transfer(payload.threadId),
      payload,
    });

    return conversationThreadSchema.parse(response);
  } catch (error) {
    if (shouldUseMockComplaints() && isNetworkError(error)) {
      return conversationThreadSchema.parse(transferMockConversation(payload));
    }

    throw error;
  }
};

export const useTransferConversationMutation = (): UseMutationResult<
  ConversationThread,
  Error,
  TransferConversationPayload
> => {
  const queryClient = useQueryClient();

  return useMutation<ConversationThread, Error, TransferConversationPayload>({
    mutationKey: queryKeys.complaints.transfer,
    mutationFn: transferConversation,
    onSuccess: updatedThread => {
      queryClient.setQueryData(queryKeys.complaints.detail(updatedThread.id), updatedThread);
      void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all });
    },
  });
};
