import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { queryKeys } from '#/constants';
import { getClaimCardCounts, getClaims, useCreateClaimMutation } from '#/data-layer/claims';
import type {
  ClaimsCardCounts,
  ClaimIssueType,
  ClaimListStatusFilter,
  ClaimsListRequestParams,
  ClaimsListResponse,
  CreateClaimPayload,
} from '#/types/claims.types';
import { CLAIM_ISSUE_TYPES as CLAIM_ISSUE_TYPE_VALUES } from '#/types/claims.types';
import { getApiErrorMessage } from '#/utils';

const DEFAULT_FILTERS: ClaimsListRequestParams = {
  status: 'all',
  issueType: 'all',
  page: 1,
  pageSize: 10,
};

const CLAIM_STATUS_FILTER_VALUES: readonly ClaimListStatusFilter[] = [
  'all',
  'pending',
  'forwarded',
  'approved',
  'rejected',
  'infoRequested',
  'resolved',
] as const;

const CLAIM_ISSUE_FILTER_VALUES: readonly ('all' | ClaimIssueType)[] = ['all', ...CLAIM_ISSUE_TYPE_VALUES];

interface UseClaimsResult {
  claimsQuery: UseQueryResult<ClaimsListResponse, Error>;
  cardCountsQuery: UseQueryResult<ClaimsCardCounts, Error>;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const createFiltersFromSearchParams = (): ClaimsListRequestParams => {
    const statusParam = searchParams.get('status');
    const status = CLAIM_STATUS_FILTER_VALUES.includes(statusParam as ClaimListStatusFilter)
      ? (statusParam as ClaimListStatusFilter)
      : DEFAULT_FILTERS.status;

    const issueTypeParam = searchParams.get('issueType');
    const issueType = CLAIM_ISSUE_FILTER_VALUES.includes(issueTypeParam as 'all' | ClaimIssueType)
      ? (issueTypeParam as 'all' | ClaimIssueType)
      : DEFAULT_FILTERS.issueType;

    const searchValue = searchParams.get('search');
    const normalizedSearchValue = searchValue?.trim();
    const pageParam = Number.parseInt(searchParams.get('page') ?? String(DEFAULT_FILTERS.page), 10);

    return {
      status,
      issueType,
      search: normalizedSearchValue && normalizedSearchValue.length > 0 ? (searchValue ?? undefined) : undefined,
      page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : DEFAULT_FILTERS.page,
      pageSize: DEFAULT_FILTERS.pageSize,
    };
  };

  const filters = createFiltersFromSearchParams();
  const requestFilters: ClaimsListRequestParams = {
    ...filters,
    search: filters.search?.trim() || undefined,
  };
  const createClaimMutation = useCreateClaimMutation();

  const claimsQuery = useQuery<ClaimsListResponse, Error>({
    queryKey: queryKeys.claims.list(requestFilters),
    queryFn: () => getClaims(requestFilters),
  });
  const cardCountsQuery = useQuery<ClaimsCardCounts, Error>({
    queryKey: queryKeys.claims.cardCounts,
    queryFn: getClaimCardCounts,
  });

  const setStatusFilter = (status: ClaimListStatusFilter): void => {
    setSearchParams(previous => {
      const nextParams = new URLSearchParams(previous);
      nextParams.set('status', status);
      nextParams.set('page', '1');
      return nextParams;
    });
  };

  const setIssueTypeFilter = (issueType: 'all' | ClaimIssueType): void => {
    setSearchParams(previous => {
      const nextParams = new URLSearchParams(previous);
      nextParams.set('issueType', issueType);
      nextParams.set('page', '1');
      return nextParams;
    });
  };

  const setSearch = (search?: string): void => {
    setSearchParams(previous => {
      const nextParams = new URLSearchParams(previous);
      if (search && search.length > 0) {
        nextParams.set('search', search);
      } else {
        nextParams.delete('search');
      }
      nextParams.set('page', '1');
      return nextParams;
    });
  };

  const setPage = (page: number): void => {
    setSearchParams(previous => {
      const nextParams = new URLSearchParams(previous);
      nextParams.set('page', String(page));
      return nextParams;
    });
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
    cardCountsQuery,
    filters,
    setStatusFilter,
    setIssueTypeFilter,
    setSearch,
    setPage,
    handleCreateClaim,
    isCreateClaimPending: createClaimMutation.isPending,
  };
};
