import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { PATCH, apiEndpoints, queryKeys } from '#/constants';
import { conversationThreadSchema } from '#/schemas/complaints.schema';
import { performRequest } from '#/services/apiClient';
import { COMPLAINT_ACTIONS } from '#/types/complaints';
import type { CloseConversationPayload, ComplaintDetailApiResponse, ConversationThread } from '#/types/complaints';
import { normalizeComplaintDetailResponse } from '#/utils';

interface ComplaintActionRequestPayload extends Record<string, unknown> {
  action: 'CLOSE';
  closureNote?: string;
}

export const closeConversation = async (payload: CloseConversationPayload): Promise<ConversationThread> => {
  const response = await performRequest<ComplaintDetailApiResponse, ComplaintActionRequestPayload>({
    method: PATCH,
    url: apiEndpoints.complaints.detail(payload.threadId),
    payload: {
      action: COMPLAINT_ACTIONS.CLOSE,
      ...(payload.closureNote ? { closureNote: payload.closureNote } : {}),
    },
  });

  const normalizedResponse = normalizeComplaintDetailResponse(response);
  return conversationThreadSchema.parse(normalizedResponse);
};

export const useCloseConversationMutation = (): UseMutationResult<
  ConversationThread,
  Error,
  CloseConversationPayload
> => {
  const queryClient = useQueryClient();

  return useMutation<ConversationThread, Error, CloseConversationPayload>({
    mutationKey: queryKeys.complaints.close,
    mutationFn: closeConversation,
    onSuccess: updatedThread => {
      queryClient.setQueryData(queryKeys.complaints.detail(updatedThread.id), updatedThread);
      void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all });
    },
  });
};
