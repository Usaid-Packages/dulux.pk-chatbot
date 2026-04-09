import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '#/constants';
import { getConversations, getLiveChatCardCounts } from '#/data-layer/complaints';
import type {
  ConversationListRequestParams,
  ConversationListResponse,
  ConversationStatusFilter,
  LiveChatCardCounts,
} from '#/types/complaints';
import { useComplaintsQueueSocket } from './useComplaintsQueueSocket';

const DEFAULT_FILTERS: ConversationListRequestParams = {
  status: 'all',
  search: undefined,
  page: 1,
  pageSize: 10,
};

interface UseComplaintsResult {
  conversationsQuery: UseQueryResult<ConversationListResponse, Error>;
  cardCountsQuery: UseQueryResult<LiveChatCardCounts, Error>;
  filters: ConversationListRequestParams;
  setStatusFilter: (status: ConversationStatusFilter) => void;
  setSearch: (search?: string) => void;
  setPage: (page: number) => void;
}

/**
 * useComplaints manages list filters and conversation list state.
 *
 * @returns Query state with list-filter setters.
 */
export const useComplaints = (): UseComplaintsResult => {
  const [filters, setFilters] = useState<ConversationListRequestParams>(DEFAULT_FILTERS);
  useComplaintsQueueSocket({ enabled: true });

  const conversationsQuery = useQuery<ConversationListResponse, Error>({
    queryKey: queryKeys.complaints.list(filters),
    queryFn: () => getConversations(filters),
    refetchOnWindowFocus: false,
  });
  const cardCountsQuery = useQuery<LiveChatCardCounts, Error>({
    queryKey: queryKeys.complaints.cardCountsLiveChat,
    queryFn: getLiveChatCardCounts,
    refetchOnWindowFocus: false,
  });

  const setStatusFilter = (status: ConversationStatusFilter): void => {
    setFilters(previous => ({ ...previous, status, page: 1 }));
  };

  const setSearch = (search?: string): void => {
    const normalized = search?.trim();
    setFilters(previous => ({
      ...previous,
      search: normalized && normalized.length > 0 ? normalized : undefined,
      page: 1,
    }));
  };

  const setPage = (page: number): void => {
    setFilters(previous => ({ ...previous, page }));
  };

  return {
    conversationsQuery,
    cardCountsQuery,
    filters,
    setStatusFilter,
    setSearch,
    setPage,
  };
};
