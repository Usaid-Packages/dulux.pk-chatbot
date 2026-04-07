import { GET, apiEndpoints } from '#/constants';
import { conversationListResponseSchema } from '#/schemas/complaints.schema';
import { performRequest } from '#/services/apiClient';
import type { ComplaintListApiResponse } from '#/types/complaints';
import type { ConversationListRequestParams, ConversationListResponse } from '#/types/complaints';
import { normalizeComplaintsListResponse } from '#/utils';

const DEFAULT_LIST_PARAMS: ConversationListRequestParams = {
  status: 'all',
  page: 1,
  pageSize: 10,
};

export const getConversations = async (
  params?: Partial<ConversationListRequestParams>
): Promise<ConversationListResponse> => {
  const requestParams = { ...DEFAULT_LIST_PARAMS, ...params };
  const response = await performRequest<ComplaintListApiResponse, undefined, Record<string, string | number>>({
    method: GET,
    url: apiEndpoints.complaints.list,
    params: {
      status: requestParams.status === 'all' ? '' : requestParams.status,
      search: requestParams.search ?? '',
      page: requestParams.page,
      pageSize: requestParams.pageSize,
    },
  });

  const normalizedResponse = normalizeComplaintsListResponse(response, requestParams.page, requestParams.pageSize);
  return conversationListResponseSchema.parse(normalizedResponse);
};
