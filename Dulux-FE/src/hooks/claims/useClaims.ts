import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '#/constants';
import { getClaimCardCounts, getClaims, useCreateClaimMutation } from '#/data-layer/claims';
import { executeMutationWithFeedback } from '#/hooks/common/mutationFeedback';
import { useUrlFilters } from '#/hooks/common/useUrlFilters';
import { useDebouncedValue } from '#/hooks/useDebouncedValue';
import type {
  ClaimsCardCounts,
  ClaimIssueType,
  ClaimListStatusFilter,
  ClaimsListRequestParams,
  ClaimsListResponse,
  CreateClaimPayload,
} from '#/types/claims.types';
import { CLAIM_ISSUE_TYPES as CLAIM_ISSUE_TYPE_VALUES } from '#/types/claims.types';

const DEFAULT_FILTERS: ClaimsListRequestParams = {
  status: 'all',
  issueType: 'all',
  page: 1,
  pageSize: 10,
};

const CLAIM_STATUS_FILTER_VALUES: readonly ClaimListStatusFilter[] = [
  'all',
  'submitted',
  'inReview',
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
  const { searchParams, setPage, setParam } = useUrlFilters({ defaultPage: DEFAULT_FILTERS.page });
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
  const debouncedSearch = useDebouncedValue(filters.search ?? '');
  const requestFilters: ClaimsListRequestParams = {
    ...filters,
    search: debouncedSearch.trim() || undefined,
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
    setParam('status', status, { resetPage: true, removeWhenEmpty: false });
  };

  const setIssueTypeFilter = (issueType: 'all' | ClaimIssueType): void => {
    setParam('issueType', issueType, { resetPage: true, removeWhenEmpty: false });
  };

  const setSearch = (search?: string): void => {
    setParam('search', search, { resetPage: true });
  };

  const handleCreateClaim = (payload: CreateClaimPayload, options?: { onSuccess?: () => void }): void => {
    executeMutationWithFeedback({
      mutate: createClaimMutation.mutate,
      payload,
      successMessage: 'Claim created successfully.',
      onSuccess: () => {
        options?.onSuccess?.();
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
