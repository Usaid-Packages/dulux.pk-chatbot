import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { PATCH, apiEndpoints, queryKeys } from '#/constants';
import { conversationThreadSchema } from '#/schemas/complaints.schema';
import { performRequest } from '#/services/apiClient';
import { COMPLAINT_ACTIONS } from '#/types/complaints';
import type { ComplaintDetailApiResponse, ConversationThread } from '#/types/complaints';
import { normalizeComplaintDetailResponse } from '#/utils';

interface MarkConversationInProgressPayload extends Record<string, unknown> {
  threadId: string;
  assignedTo: number;
}

interface ComplaintActionRequestPayload extends Record<string, unknown> {
  action: 'ASSIGN';
  assignedTo: number;
}

export const markConversationInProgress = async (
  payload: MarkConversationInProgressPayload
): Promise<ConversationThread> => {
  if (!Number.isFinite(payload.assignedTo)) {
    throw new Error('Assigned user is required for assign action.');
  }

  const response = await performRequest<ComplaintDetailApiResponse, ComplaintActionRequestPayload>({
    method: PATCH,
    url: apiEndpoints.complaints.detail(payload.threadId),
    payload: {
      action: COMPLAINT_ACTIONS.ASSIGN,
      assignedTo: payload.assignedTo,
    },
  });

  const normalizedResponse = normalizeComplaintDetailResponse(response);
  return conversationThreadSchema.parse(normalizedResponse);
};

export const useMarkConversationInProgressMutation = (): UseMutationResult<
  ConversationThread,
  Error,
  MarkConversationInProgressPayload
> => {
  const queryClient = useQueryClient();

  return useMutation<ConversationThread, Error, MarkConversationInProgressPayload>({
    mutationKey: queryKeys.complaints.markInProgress,
    mutationFn: markConversationInProgress,
    onSuccess: updatedThread => {
      queryClient.setQueryData(queryKeys.complaints.detail(updatedThread.id), updatedThread);
      void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all });
    },
  });
};
