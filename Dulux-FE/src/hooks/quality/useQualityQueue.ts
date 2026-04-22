import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '#/constants';
import { getQualityCardCounts, getQualityQueue } from '#/data-layer/quality';
import { useUrlFilters } from '#/hooks/common/useUrlFilters';
import type {
  QualityCardCounts,
  QualityQueueRequestParams,
  QualityQueueResponse,
  QualityQueueStatusFilter,
} from '#/types/quality.types';

const DEFAULT_FILTERS: QualityQueueRequestParams = {
  status: 'all',
  page: 1,
  pageSize: 10,
};

interface UseQualityQueueResult {
  qualityQueueQuery: UseQueryResult<QualityQueueResponse, Error>;
  cardCountsQuery: UseQueryResult<QualityCardCounts, Error>;
  filters: QualityQueueRequestParams;
  setStatusFilter: (status: QualityQueueStatusFilter) => void;
  setPage: (page: number) => void;
}

/**
 * useQualityQueue manages quality queue filters and server-state fetching.
 *
 * @returns Query state plus queue filter setters.
 */
export const useQualityQueue = (): UseQualityQueueResult => {
  const { searchParams, setPage, setParam } = useUrlFilters({ defaultPage: DEFAULT_FILTERS.page });
  const statusParam = searchParams.get('status');
  const status: QualityQueueStatusFilter =
    statusParam === 'all' ||
    statusParam === 'forwarded' ||
    statusParam === 'infoRequested' ||
    statusParam === 'resolved'
      ? statusParam
      : DEFAULT_FILTERS.status;
  const pageParam = Number.parseInt(searchParams.get('page') ?? String(DEFAULT_FILTERS.page), 10);

  const filters: QualityQueueRequestParams = {
    status,
    page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : DEFAULT_FILTERS.page,
    pageSize: DEFAULT_FILTERS.pageSize,
  };

  const qualityQueueQuery = useQuery<QualityQueueResponse, Error>({
    queryKey: queryKeys.quality.list(filters),
    queryFn: () => getQualityQueue(filters),
  });
  const cardCountsQuery = useQuery<QualityCardCounts, Error>({
    queryKey: queryKeys.quality.cardCounts,
    queryFn: getQualityCardCounts,
  });

  const setStatusFilter = (status: QualityQueueStatusFilter): void => {
    setParam('status', status, { resetPage: true, removeWhenEmpty: false });
  };

  return {
    qualityQueueQuery,
    cardCountsQuery,
    filters,
    setStatusFilter,
    setPage,
  };
};
