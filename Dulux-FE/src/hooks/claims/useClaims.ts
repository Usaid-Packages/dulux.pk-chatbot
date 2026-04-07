import { useState } from 'react';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { queryKeys } from '#/constants';
import { getClaims, useCreateClaimMutation } from '#/data-layer/claims';
import type {
  ClaimIssueType,
  ClaimListStatusFilter,
  ClaimsListRequestParams,
  ClaimsListResponse,
  CreateClaimPayload,
} from '#/types/claims.types';
import { getApiErrorMessage } from '#/utils';

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
  setSearch: (search?: string) => void;
  setPage: (page: number) => void;
  handleCreateClaim: (payload: CreateClaimPayload, options?: { onSuccess?: () => void }) => void;
  isCreateClaimPending: boolean;
}

/**
 * useClaims manages claims list filters and server-state fetching.
 *
 * @returns Query state plus filter setters for claims list page.
 */
export const useClaims = (): UseClaimsResult => {
  const [filters, setFilters] = useState<ClaimsListRequestParams>(DEFAULT_FILTERS);
  const createClaimMutation = useCreateClaimMutation();

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

  const setSearch = (search?: string): void => {
    const normalizedSearch = search?.trim();
    setFilters(previous => ({
      ...previous,
      search: normalizedSearch && normalizedSearch.length > 0 ? normalizedSearch : undefined,
      page: 1,
    }));
  };

  const setPage = (page: number): void => {
    setFilters(previous => ({ ...previous, page }));
  };

  const handleCreateClaim = (payload: CreateClaimPayload, options?: { onSuccess?: () => void }): void => {
    createClaimMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Claim created successfully.');
        options?.onSuccess?.();
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  return {
    claimsQuery,
    filters,
    setStatusFilter,
    setIssueTypeFilter,
    setSearch,
    setPage,
    handleCreateClaim,
    isCreateClaimPending: createClaimMutation.isPending,
  };
};
