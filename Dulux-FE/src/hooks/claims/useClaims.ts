import { useState } from 'react';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '#/constants';
import { getClaims } from '#/data-layer/claims';
import type {
  ClaimIssueType,
  ClaimListStatusFilter,
  ClaimsListRequestParams,
  ClaimsListResponse,
} from '#/types/claims.types';

const DEFAULT_FILTERS: ClaimsListRequestParams = {
  status: 'all',
  issueType: 'all',
  page: 1,
  pageSize: 10,
};

interface UseClaimsResult {
  claimsQuery: UseQueryResult<ClaimsListResponse, Error>;
  filters: ClaimsListRequestParams;
  setStatusFilter: (status: ClaimListStatusFilter) => void;
  setIssueTypeFilter: (issueType: 'all' | ClaimIssueType) => void;
  setFromDate: (fromDate?: string) => void;
  setToDate: (toDate?: string) => void;
  setPage: (page: number) => void;
}

/**
 * useClaims manages claims list filters and server-state fetching.
 *
 * @returns Query state plus filter setters for claims list page.
 */
export const useClaims = (): UseClaimsResult => {
  const [filters, setFilters] = useState<ClaimsListRequestParams>(DEFAULT_FILTERS);

  const claimsQuery = useQuery<ClaimsListResponse, Error>({
    queryKey: queryKeys.claims.list(filters),
    queryFn: () => getClaims(filters),
  });

  const setStatusFilter = (status: ClaimListStatusFilter): void => {
    setFilters(previous => ({ ...previous, status, page: 1 }));
  };

  const setIssueTypeFilter = (issueType: 'all' | ClaimIssueType): void => {
    setFilters(previous => ({ ...previous, issueType, page: 1 }));
  };

  const setFromDate = (fromDate?: string): void => {
    setFilters(previous => ({ ...previous, fromDate, page: 1 }));
  };

  const setToDate = (toDate?: string): void => {
    setFilters(previous => ({ ...previous, toDate, page: 1 }));
  };

  const setPage = (page: number): void => {
    setFilters(previous => ({ ...previous, page }));
  };

  return {
    claimsQuery,
    filters,
    setStatusFilter,
    setIssueTypeFilter,
    setFromDate,
    setToDate,
    setPage,
  };
};
