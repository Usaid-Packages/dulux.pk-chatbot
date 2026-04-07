import { GET, apiEndpoints } from '#/constants';
import { conversationThreadSchema } from '#/schemas/complaints.schema';
import { performRequest } from '#/services/apiClient';
import type { ComplaintDetailApiResponse, ConversationThread } from '#/types/complaints';
import { normalizeComplaintDetailResponse } from '#/utils';

export const getConversationById = async (threadId: string): Promise<ConversationThread> => {
  const response = await performRequest<ComplaintDetailApiResponse>({
    method: GET,
    url: apiEndpoints.complaints.detail(threadId),
  });

  const normalizedResponse = normalizeComplaintDetailResponse(response);
  return conversationThreadSchema.parse(normalizedResponse);
};
