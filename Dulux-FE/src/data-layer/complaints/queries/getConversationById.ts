import { GET, apiEndpoints } from '#/constants';
import { conversationThreadSchema } from '#/schemas/complaints.schema';
import { performRequest } from '#/services/apiClient';
import type { ConversationThread } from '#/types/complaints';
import { getMockConversationById } from '../mockComplaintsStore';
import { isNetworkError, shouldUseMockComplaints } from '../transport';

export const getConversationById = async (threadId: string): Promise<ConversationThread> => {
  try {
    const response = await performRequest<ConversationThread>({
      method: GET,
      url: apiEndpoints.complaints.detail(threadId),
    });

    return conversationThreadSchema.parse(response);
  } catch (error) {
    if (shouldUseMockComplaints() && isNetworkError(error)) {
      return conversationThreadSchema.parse(getMockConversationById(threadId));
    }

    throw error;
  }
};
