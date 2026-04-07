import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { complaintApiMessageSchema } from '#/schemas/complaints.schema';
import { performRequest } from '#/services/apiClient';
import type { ChatMessage } from '#/types/complaints';
import type { ComplaintApiMessage } from '#/types/complaints';
import type { ConversationThread } from '#/types/complaints';
import type { SendMessagePayload } from '#/types/complaints';
import { appendMessageToConversationThread, normalizeComplaintApiMessage } from '#/utils';

interface SendMessageRequestBody {
  text: string;
}

export const sendConversationMessage = async (payload: SendMessagePayload): Promise<ChatMessage> => {
  const response = await performRequest<ComplaintApiMessage, SendMessageRequestBody>({
    method: POST,
    url: apiEndpoints.complaints.sendMessage(payload.threadId),
    payload: {
      text: payload.message.trim(),
    },
  });

  const parsedResponse = complaintApiMessageSchema.parse(response);
  return normalizeComplaintApiMessage(parsedResponse, payload.threadId);
};

export const useSendConversationMessageMutation = (): UseMutationResult<ChatMessage, Error, SendMessagePayload> => {
  const queryClient = useQueryClient();

  return useMutation<ChatMessage, Error, SendMessagePayload>({
    mutationKey: queryKeys.complaints.sendMessage,
    mutationFn: sendConversationMessage,
    onSuccess: (message, variables) => {
      queryClient.setQueryData<ConversationThread | undefined>(
        queryKeys.complaints.detail(variables.threadId),
        previous => {
          if (!previous) {
            return previous;
          }

          return appendMessageToConversationThread(previous, message);
        }
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all });
    },
  });
};
