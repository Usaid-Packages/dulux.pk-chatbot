import { useMemo, useState } from 'react';

import { REGISTRATION_TAB_TO_STATUS } from '#/constants';
import { useGetRegistrationsQuery } from '#/data-layer/registrations';
import {
  registrationFilterTabs,
  type RegistrationFilterTab,
  type RegistrationListItem,
  type RegistrationStatus,
} from '#/types/registrations';

const DEFAULT_PAGE = 1;

export interface RegistrationStats {
  total: number;
  pending: number;
  approved: number;
}

export interface UseRegistrationsResult {
  activeTab: RegistrationFilterTab;
  searchValue: string;
  statusValue: RegistrationStatus | 'ALL';
  dateFrom: string;
  dateTo: string;
  currentPage: number;
  registrations: RegistrationListItem[];
  stats: RegistrationStats;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  setSearchValue: (value: string) => void;
  setStatusValue: (value: RegistrationStatus | 'ALL') => void;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  setActiveTab: (tab: RegistrationFilterTab) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
}

const isWithinDateRange = (value: string, startDate: string, endDate: string): boolean => {
  if (!startDate && !endDate) {
    return true;
  }

  const valueTime = new Date(value).getTime();

  if (Number.isNaN(valueTime)) {
    return false;
  }

  if (startDate) {
    const startTime = new Date(startDate).getTime();
    if (!Number.isNaN(startTime) && valueTime < startTime) {
      return false;
    }
  }

  if (endDate) {
    const endDateInclusive = new Date(endDate);
    endDateInclusive.setHours(23, 59, 59, 999);
    const endTime = endDateInclusive.getTime();
    if (!Number.isNaN(endTime) && valueTime > endTime) {
      return false;
    }
  }

  return true;
};

/**
 * Manages registrations list filters and query integration.
 *
 * @returns Registrations list state, actions, and query results.
 */
export const useRegistrations = (): UseRegistrationsResult => {
  const [activeTab, setActiveTabState] = useState<RegistrationFilterTab>(registrationFilterTabs[0]);
  const [searchValue, setSearchValueState] = useState<string>('');
  const [statusValue, setStatusValueState] = useState<RegistrationStatus | 'ALL'>('ALL');
  const [dateFrom, setDateFromState] = useState<string>('');
  const [dateTo, setDateToState] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(DEFAULT_PAGE);

  const stateFromTab = REGISTRATION_TAB_TO_STATUS[activeTab];
  const effectiveStateFilter = statusValue === 'ALL' ? stateFromTab : statusValue;

  const queryResult = useGetRegistrationsQuery({
    page: currentPage,
    search: searchValue.trim() || undefined,
    state: effectiveStateFilter,
  });

  const rows = queryResult.data?.results ?? [];

  const registrations = useMemo<RegistrationListItem[]>(() => {
    return rows.filter(item => isWithinDateRange(item.created, dateFrom, dateTo));
  }, [dateFrom, dateTo, rows]);

  const stats = useMemo<RegistrationStats>(() => {
    return rows.reduce<RegistrationStats>(
      (accumulator, item) => {
        if (item.state === 'SUBMITTED' || item.state === 'IN_PROGRESS') {
          accumulator.pending += 1;
        }
        if (item.state === 'APPROVED') {
          accumulator.approved += 1;
        }
        accumulator.total += 1;
        return accumulator;
      },
      { total: 0, pending: 0, approved: 0 }
    );
  }, [rows]);

  const handleSearchChange = (value: string): void => {
    setSearchValueState(value);
    setCurrentPage(DEFAULT_PAGE);
  };

  const handleStatusChange = (value: RegistrationStatus | 'ALL'): void => {
    setStatusValueState(value);
    setCurrentPage(DEFAULT_PAGE);
  };

  const handleDateFromChange = (value: string): void => {
    setDateFromState(value);
  };

  const handleDateToChange = (value: string): void => {
    setDateToState(value);
  };

  const handleTabChange = (tab: RegistrationFilterTab): void => {
    setActiveTabState(tab);
    setCurrentPage(DEFAULT_PAGE);
  };

  const goToNextPage = (): void => {
    if (queryResult.data?.next) {
      setCurrentPage(previousPage => previousPage + 1);
    }
  };

  const goToPreviousPage = (): void => {
    if (currentPage > DEFAULT_PAGE) {
      setCurrentPage(previousPage => previousPage - 1);
    }
  };

  return {
    activeTab,
    searchValue,
    statusValue,
    dateFrom,
    dateTo,
    currentPage,
    registrations,
    stats,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    errorMessage: queryResult.error?.message ?? 'Unable to load registrations.',
    hasNextPage: Boolean(queryResult.data?.next),
    hasPreviousPage: currentPage > DEFAULT_PAGE,
    setSearchValue: handleSearchChange,
    setStatusValue: handleStatusChange,
    setDateFrom: handleDateFromChange,
    setDateTo: handleDateToChange,
    setActiveTab: handleTabChange,
    goToNextPage,
    goToPreviousPage,
  };
};
