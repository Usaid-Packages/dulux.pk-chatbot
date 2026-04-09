import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { queryKeys } from '#/constants';
import { getQualityCardCounts, getQualityQueue } from '#/data-layer/quality';
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
  const [searchParams, setSearchParams] = useSearchParams();
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
    setSearchParams(previous => {
      const nextParams = new URLSearchParams(previous);
      nextParams.set('status', status);
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

  return {
    qualityQueueQuery,
    cardCountsQuery,
    filters,
    setStatusFilter,
    setPage,
  };
};
