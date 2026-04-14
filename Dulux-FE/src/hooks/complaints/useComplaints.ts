import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '#/constants';
import { getConversations, getLiveChatCardCounts } from '#/data-layer/complaints';
import { useDebouncedValue } from '#/hooks/useDebouncedValue';
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
  const debouncedSearch = useDebouncedValue(filters.search ?? '');
  const requestFilters: ConversationListRequestParams = {
    ...filters,
    search: debouncedSearch.trim() || undefined,
  };
  useComplaintsQueueSocket({ enabled: true });

  const conversationsQuery = useQuery<ConversationListResponse, Error>({
    queryKey: queryKeys.complaints.list(requestFilters),
    queryFn: () => getConversations(requestFilters),
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
    setFilters(previous => ({
      ...previous,
      search: search && search.length > 0 ? search : undefined,
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
