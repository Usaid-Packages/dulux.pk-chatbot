/* eslint import/order: off */
import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '#/constants';
import { getConversations } from '#/data-layer/complaints';
import type {
  ConversationListRequestParams,
  ConversationListResponse,
  ConversationPriorityFilter,
  ConversationStatusFilter,
} from '#/types/complaints';

const DEFAULT_FILTERS: ConversationListRequestParams = {
  status: 'all',
  priority: 'all',
  search: undefined,
  page: 1,
  pageSize: 10,
};

interface UseComplaintsResult {
  conversationsQuery: UseQueryResult<ConversationListResponse, Error>;
  filters: ConversationListRequestParams;
  setStatusFilter: (status: ConversationStatusFilter) => void;
  setPriorityFilter: (priority: ConversationPriorityFilter) => void;
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

  const conversationsQuery = useQuery<ConversationListResponse, Error>({
    queryKey: queryKeys.complaints.list(filters),
    queryFn: () => getConversations(filters),
    refetchInterval: 20_000,
  });

  const setStatusFilter = (status: ConversationStatusFilter): void => {
    setFilters(previous => ({ ...previous, status, page: 1 }));
  };

  const setPriorityFilter = (priority: ConversationPriorityFilter): void => {
    setFilters(previous => ({ ...previous, priority, page: 1 }));
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
    filters,
    setStatusFilter,
    setPriorityFilter,
    setSearch,
    setPage,
  };
};
