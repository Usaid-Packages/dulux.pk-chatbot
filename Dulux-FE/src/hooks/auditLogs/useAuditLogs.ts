import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { queryKeys } from '#/constants';
import { getAuditLogDetail, getAuditLogs } from '#/data-layer/auditLogs';
import { useDebouncedValue } from '#/hooks/useDebouncedValue';
import type {
  AuditLogActionFilter,
  AuditLogDetail,
  AuditLogListFilters,
  AuditLogListResponse,
  AuditLogOrdering,
} from '#/types/auditLogs';
import { AUDIT_LOG_ACTION_FILTERS, AUDIT_LOG_DEFAULT_ORDERING, AUDIT_LOG_ORDERING_FIELDS } from '#/types/auditLogs';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

const VALID_ACTION_FILTERS = new Set<string>(AUDIT_LOG_ACTION_FILTERS);
const VALID_ORDERING_VALUES = new Set<string>([
  ...AUDIT_LOG_ORDERING_FIELDS,
  ...AUDIT_LOG_ORDERING_FIELDS.map(field => `-${field}`),
]);

const resolveActionFilter = (value: string | null): AuditLogActionFilter => {
  if (value && VALID_ACTION_FILTERS.has(value)) {
    return value as AuditLogActionFilter;
  }

  return 'all';
};

const resolveOrdering = (value: string | null): AuditLogOrdering => {
  if (value && VALID_ORDERING_VALUES.has(value)) {
    return value as AuditLogOrdering;
  }

  return AUDIT_LOG_DEFAULT_ORDERING;
};

interface UseAuditLogsResult {
  filters: AuditLogListFilters;
  auditLogsQuery: UseQueryResult<AuditLogListResponse, Error>;
  detailQuery: UseQueryResult<AuditLogDetail, Error>;
  selectedAuditLogId: string;
  setActionFilter: (action: AuditLogActionFilter) => void;
  setOrdering: (ordering: AuditLogOrdering) => void;
  setActorFilter: (actor: string) => void;
  setModelLabelFilter: (modelLabel: string) => void;
  setObjectIdFilter: (objectId: string) => void;
  setDateFromFilter: (dateFrom: string) => void;
  setDateToFilter: (dateTo: string) => void;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  openDetail: (id: string) => void;
  closeDetail: () => void;
}

/**
 * useAuditLogs manages filter query params and list/detail fetch lifecycle for audit logs.
 *
 * @returns Audit logs list and detail query state with filter + selection actions.
 */
export const useAuditLogs = (): UseAuditLogsResult => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAuditLogId, setSelectedAuditLogId] = useState('');

  const pageParam = Number.parseInt(searchParams.get('page') ?? String(DEFAULT_PAGE), 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : DEFAULT_PAGE;

  const filters: AuditLogListFilters = {
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    action: resolveActionFilter(searchParams.get('action')),
    actor: searchParams.get('actor') ?? '',
    modelLabel: searchParams.get('modelLabel') ?? '',
    objectId: searchParams.get('objectId') ?? '',
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    search: searchParams.get('search') ?? '',
    ordering: resolveOrdering(searchParams.get('ordering')),
  };
  const debouncedSearch = useDebouncedValue(filters.search);
  const requestFilters: AuditLogListFilters = {
    ...filters,
    search: debouncedSearch,
  };

  const auditLogsQuery = useQuery<AuditLogListResponse, Error>({
    queryKey: queryKeys.auditLogs.list(requestFilters),
    queryFn: () => getAuditLogs(requestFilters),
  });

  const detailQuery = useQuery<AuditLogDetail, Error>({
    queryKey: queryKeys.auditLogs.detail(selectedAuditLogId),
    queryFn: () => getAuditLogDetail(selectedAuditLogId),
    enabled: selectedAuditLogId.trim().length > 0,
  });

  const updateSearchParam = (key: string, value: string): void => {
    setSearchParams(previous => {
      const nextParams = new URLSearchParams(previous);

      if (value.trim().length > 0) {
        nextParams.set(key, value.trim());
      } else {
        nextParams.delete(key);
      }

      nextParams.set('page', String(DEFAULT_PAGE));
      return nextParams;
    });
  };

  const setActionFilter = (action: AuditLogActionFilter): void => {
    if (action === 'all') {
      updateSearchParam('action', '');
      return;
    }

    updateSearchParam('action', action);
  };

  const setOrdering = (ordering: AuditLogOrdering): void => {
    updateSearchParam('ordering', ordering);
  };

  const setActorFilter = (actor: string): void => {
    updateSearchParam('actor', actor);
  };

  const setModelLabelFilter = (modelLabel: string): void => {
    updateSearchParam('modelLabel', modelLabel);
  };

  const setObjectIdFilter = (objectId: string): void => {
    updateSearchParam('objectId', objectId);
  };

  const setDateFromFilter = (dateFrom: string): void => {
    updateSearchParam('dateFrom', dateFrom);
  };

  const setDateToFilter = (dateTo: string): void => {
    updateSearchParam('dateTo', dateTo);
  };

  const setSearch = (search: string): void => {
    setSearchParams(previous => {
      const nextParams = new URLSearchParams(previous);

      if (search.length > 0) {
        nextParams.set('search', search);
      } else {
        nextParams.delete('search');
      }

      nextParams.set('page', String(DEFAULT_PAGE));
      return nextParams;
    });
  };

  const setPage = (nextPage: number): void => {
    if (!Number.isFinite(nextPage) || nextPage < 1) {
      return;
    }

    setSearchParams(previous => {
      const nextParams = new URLSearchParams(previous);
      nextParams.set('page', String(nextPage));
      return nextParams;
    });
  };

  const openDetail = (id: string): void => {
    setSelectedAuditLogId(id);
  };

  const closeDetail = (): void => {
    setSelectedAuditLogId('');
  };

  return {
    filters,
    auditLogsQuery,
    detailQuery,
    selectedAuditLogId,
    setActionFilter,
    setOrdering,
    setActorFilter,
    setModelLabelFilter,
    setObjectIdFilter,
    setDateFromFilter,
    setDateToFilter,
    setSearch,
    setPage,
    openDetail,
    closeDetail,
  };
};
