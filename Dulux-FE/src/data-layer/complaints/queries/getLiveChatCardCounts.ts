import { GET, apiEndpoints } from '#/constants';
import { liveChatCardCountsSchema } from '#/schemas/complaints.schema';
import { performRequest } from '#/services/apiClient';
import type { LiveChatCardCounts } from '#/types/complaints';

export const getLiveChatCardCounts = async (): Promise<LiveChatCardCounts> => {
  const response = await performRequest<LiveChatCardCounts>({
    method: GET,
    url: apiEndpoints.complaints.cardCountsLiveChat,
  });

  return liveChatCardCountsSchema.parse(response);
};
