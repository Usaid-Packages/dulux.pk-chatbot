import { useState } from 'react';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '#/constants';
import { getQualityQueue } from '#/data-layer/quality';
import type { QualityQueueRequestParams, QualityQueueResponse, QualityQueueStatusFilter } from '#/types/quality.types';

const DEFAULT_FILTERS: QualityQueueRequestParams = {
  status: 'all',
  page: 1,
  pageSize: 10,
};

interface UseQualityQueueResult {
  qualityQueueQuery: UseQueryResult<QualityQueueResponse, Error>;
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
  const [filters, setFilters] = useState<QualityQueueRequestParams>(DEFAULT_FILTERS);

  const qualityQueueQuery = useQuery<QualityQueueResponse, Error>({
    queryKey: queryKeys.quality.list(filters),
    queryFn: () => getQualityQueue(filters),
  });

  const setStatusFilter = (status: QualityQueueStatusFilter): void => {
    setFilters(previous => ({ ...previous, status, page: 1 }));
  };

  const setPage = (page: number): void => {
    setFilters(previous => ({ ...previous, page }));
  };

  return {
    qualityQueueQuery,
    filters,
    setStatusFilter,
    setPage,
  };
};
