import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { queryKeys, REGISTRATION_TAB_TO_STATUS } from '#/constants';
import { getRegistrationCardCounts, useGetRegistrationsQuery } from '#/data-layer/registrations';
import { registrationFilterTabs } from '#/types/registrations';
import type {
  RegistrationCardCounts,
  RegistrationFilterTab,
  RegistrationListItem,
  RegistrationStatus,
} from '#/types/registrations';

const DEFAULT_PAGE = 1;
const DEFAULT_TAB = registrationFilterTabs[0];
const REGISTRATIONS_PAGE_SIZE = 10;

const isRegistrationStatus = (value: string | null): value is RegistrationStatus => {
  return (
    value === 'SUBMITTED' ||
    value === 'IN_PROGRESS' ||
    value === 'APPROVED' ||
    value === 'REJECTED' ||
    value === 'RESUBMIT'
  );
};

const isRegistrationFilterTab = (value: string | null): value is RegistrationFilterTab => {
  return registrationFilterTabs.includes(value as RegistrationFilterTab);
};

export interface RegistrationStats {
  total: number;
  pending: number;
  approved: number;
}

export interface UseRegistrationsResult {
  activeTab: RegistrationFilterTab;
  searchValue: string;
  statusValue: RegistrationStatus | 'ALL';
  currentPage: number;
  totalPages: number;
  registrations: RegistrationListItem[];
  stats: RegistrationStats;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  setSearchValue: (value: string) => void;
  setStatusValue: (value: RegistrationStatus | 'ALL') => void;
  setActiveTab: (tab: RegistrationFilterTab) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
}

/**
 * Manages registrations list filters and query integration.
 *
 * @returns Registrations list state, actions, and query results.
 */
export const useRegistrations = (): UseRegistrationsResult => {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTabParam = searchParams.get('tab');
  const activeTab = isRegistrationFilterTab(activeTabParam) ? activeTabParam : DEFAULT_TAB;

  const searchValue = searchParams.get('search') ?? '';
  const statusParam = searchParams.get('status');
  const statusValue: RegistrationStatus | 'ALL' =
    statusParam === 'ALL' ? 'ALL' : isRegistrationStatus(statusParam) ? statusParam : 'ALL';

  const pageParam = Number.parseInt(searchParams.get('page') ?? String(DEFAULT_PAGE), 10);
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : DEFAULT_PAGE;

  const stateFromTab = REGISTRATION_TAB_TO_STATUS[activeTab];
  const effectiveStateFilter = statusValue === 'ALL' ? stateFromTab : statusValue;

  const queryResult = useGetRegistrationsQuery({
    page: currentPage,
    page_size: REGISTRATIONS_PAGE_SIZE,
    search: searchValue.trim() || undefined,
    state: effectiveStateFilter,
  });
  const cardCountsQuery = useQuery<RegistrationCardCounts, Error>({
    queryKey: queryKeys.registrations.cardCounts,
    queryFn: getRegistrationCardCounts,
  });

  const registrations = queryResult.data?.results ?? [];
  const totalItems = queryResult.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / REGISTRATIONS_PAGE_SIZE));
  const stats: RegistrationStats = {
    total: cardCountsQuery.data?.totalRegistrations ?? 0,
    pending: cardCountsQuery.data?.pendingReview ?? 0,
    approved: cardCountsQuery.data?.approved ?? 0,
  };

  const handleSearchChange = (value: string): void => {
    setSearchParams(previous => {
      const nextParams = new URLSearchParams(previous);
      if (value.length > 0) {
        nextParams.set('search', value);
      } else {
        nextParams.delete('search');
      }
      nextParams.set('page', String(DEFAULT_PAGE));
      return nextParams;
    });
  };

  const handleStatusChange = (value: RegistrationStatus | 'ALL'): void => {
    setSearchParams(previous => {
      const nextParams = new URLSearchParams(previous);
      nextParams.set('status', value);
      nextParams.set('page', String(DEFAULT_PAGE));
      return nextParams;
    });
  };

  const handleTabChange = (tab: RegistrationFilterTab): void => {
    setSearchParams(previous => {
      const nextParams = new URLSearchParams(previous);
      nextParams.set('tab', tab);
      nextParams.set('page', String(DEFAULT_PAGE));
      return nextParams;
    });
  };

  const goToNextPage = (): void => {
    if (queryResult.data?.next) {
      setSearchParams(previous => {
        const nextParams = new URLSearchParams(previous);
        nextParams.set('page', String(currentPage + 1));
        return nextParams;
      });
    }
  };

  const goToPreviousPage = (): void => {
    if (currentPage > DEFAULT_PAGE) {
      setSearchParams(previous => {
        const nextParams = new URLSearchParams(previous);
        nextParams.set('page', String(currentPage - 1));
        return nextParams;
      });
    }
  };

  return {
    activeTab,
    searchValue,
    statusValue,
    currentPage,
    totalPages,
    registrations,
    stats,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    errorMessage: queryResult.error?.message ?? 'Unable to load registrations.',
    hasNextPage: Boolean(queryResult.data?.next),
    hasPreviousPage: currentPage > DEFAULT_PAGE,
    setSearchValue: handleSearchChange,
    setStatusValue: handleStatusChange,
    setActiveTab: handleTabChange,
    goToNextPage,
    goToPreviousPage,
  };
};
