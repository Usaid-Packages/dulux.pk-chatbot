/* eslint import/order: off */
import { GET, apiEndpoints } from '#/constants';
import { conversationListResponseSchema } from '#/schemas/complaints.schema';
import { performRequest } from '#/services/apiClient';
import type { ConversationListRequestParams, ConversationListResponse } from '#/types/complaints';
import { getMockConversations } from '../mockComplaintsStore';
import { isNetworkError, shouldUseMockComplaints } from '../transport';

const DEFAULT_LIST_PARAMS: ConversationListRequestParams = {
  status: 'all',
  priority: 'all',
  page: 1,
  pageSize: 10,
};

export const getConversations = async (
  params?: Partial<ConversationListRequestParams>
): Promise<ConversationListResponse> => {
  const requestParams = { ...DEFAULT_LIST_PARAMS, ...params };

  try {
    const response = await performRequest<ConversationListResponse, undefined, ConversationListRequestParams>({
      method: GET,
      url: apiEndpoints.complaints.list,
      params: requestParams,
    });

    return conversationListResponseSchema.parse(response);
  } catch (error) {
    if (shouldUseMockComplaints() && isNetworkError(error)) {
      return conversationListResponseSchema.parse(getMockConversations(requestParams));
    }

    throw error;
  }
};
