import { GET, apiEndpoints } from '#/constants';
import { complaintApiMessageSchema, conversationThreadSchema } from '#/schemas/complaints.schema';
import { performRequest } from '#/services/apiClient';
import type { ComplaintDetailApiResponse, ComplaintMessagesApiResponse, ConversationThread } from '#/types/complaints';
import { normalizeComplaintDetailResponse, normalizeComplaintMessagesResponse } from '#/utils';

export const getConversationById = async (threadId: string): Promise<ConversationThread> => {
  const detailResponse = await performRequest<ComplaintDetailApiResponse>({
    method: GET,
    url: apiEndpoints.complaints.detail(threadId),
  });

  let rawMessages = [];

  try {
    const messagesResponse = await performRequest<ComplaintMessagesApiResponse>({
      method: GET,
      url: apiEndpoints.complaints.sendMessage(threadId),
    });
    rawMessages = normalizeComplaintMessagesResponse(messagesResponse);
  } catch {
    // Messages must come from the dedicated messages endpoint.
    rawMessages = [];
  }

  const parsedMessages = rawMessages.map(message => complaintApiMessageSchema.safeParse(message));

  const validatedMessages = parsedMessages
    .filter(parsedMessage => parsedMessage.success)
    .map(parsedMessage => parsedMessage.data);

  const normalizedMessages = validatedMessages.sort((messageA, messageB) => {
    const timestampA = messageA.createdAt ?? messageA.created ?? '';
    const timestampB = messageB.createdAt ?? messageB.created ?? '';

    return timestampA.localeCompare(timestampB);
  });
  const normalizedResponse = normalizeComplaintDetailResponse(detailResponse, normalizedMessages);
  return conversationThreadSchema.parse(normalizedResponse);
};
