import { useEffect, useMemo, useState } from 'react';

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
  conversations: ConversationListResponse;
  cardCountsQuery: UseQueryResult<LiveChatCardCounts, Error>;
  filters: ConversationListRequestParams;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  loadNextPage: () => void;
  setStatusFilter: (status: ConversationStatusFilter) => void;
  setSearch: (search?: string) => void;
  setPage: (page: number) => void;
}

const EMPTY_STATS: ConversationListResponse['stats'] = {
  open: 0,
  inProgress: 0,
  resolved: 0,
  closed: 0,
};

const EMPTY_CONVERSATION_LIST: ConversationListResponse = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_FILTERS.pageSize,
  stats: EMPTY_STATS,
};

/**
 * useComplaints manages list filters and conversation list state.
 *
 * @returns Query state with list-filter setters.
 */
export const useComplaints = (): UseComplaintsResult => {
  const [filters, setFilters] = useState<ConversationListRequestParams>(DEFAULT_FILTERS);
  const [aggregatedConversations, setAggregatedConversations] =
    useState<ConversationListResponse>(EMPTY_CONVERSATION_LIST);

  const debouncedSearch = useDebouncedValue(filters.search ?? '');
  const requestFilters: ConversationListRequestParams = {
    ...filters,
    search: debouncedSearch.trim() || undefined,
  };
  const requestFilterSignature = useMemo(() => {
    return `${requestFilters.status}|${requestFilters.search ?? ''}|${requestFilters.pageSize}`;
  }, [requestFilters.pageSize, requestFilters.search, requestFilters.status]);

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

  useEffect(() => {
    setAggregatedConversations(previous => ({
      ...previous,
      items: [],
      total: 0,
      page: 1,
      pageSize: requestFilters.pageSize,
    }));
  }, [requestFilterSignature, requestFilters.pageSize]);

  useEffect(() => {
    if (!conversationsQuery.data) {
      return;
    }

    const currentPageResponse = conversationsQuery.data;
    setAggregatedConversations(previous => {
      const shouldReplace = currentPageResponse.page <= 1;
      const baseItems = shouldReplace ? [] : previous.items;
      const nextItemsMap = new Map<string, ConversationListResponse['items'][number]>();

      for (const item of baseItems) {
        nextItemsMap.set(item.id, item);
      }
      for (const item of currentPageResponse.items) {
        nextItemsMap.set(item.id, item);
      }

      return {
        ...currentPageResponse,
        items: Array.from(nextItemsMap.values()),
      };
    });
  }, [conversationsQuery.data]);

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

  const loadNextPage = (): void => {
    if (conversationsQuery.isFetching) {
      return;
    }

    setFilters(previous => ({ ...previous, page: previous.page + 1 }));
  };

  const hasNextPage = aggregatedConversations.items.length < aggregatedConversations.total;

  return {
    conversationsQuery,
    conversations: aggregatedConversations,
    cardCountsQuery,
    filters,
    hasNextPage,
    isFetchingNextPage: conversationsQuery.isFetching && filters.page > 1,
    loadNextPage,
    setStatusFilter,
    setSearch,
    setPage,
  };
};
