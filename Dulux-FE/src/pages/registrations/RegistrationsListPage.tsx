import type { JSX, MouseEvent } from 'react';

import { useNavigate } from 'react-router-dom';

import { RegistrationFilters, RegistrationTable } from '#/components/registrations';
import { Button } from '#/components/ui';
import { ROUTES } from '#/constants';
import { useRegistrations } from '#/hooks/registrations';
import { registrationFilterTabs } from '#/types/registrations';
import { cn } from '#/utils';

/**
 * RegistrationsListPage renders listing, filters, tabs, and pagination.
 *
 * @returns Registrations list route content.
 */
export const RegistrationsListPage = (): JSX.Element => {
  const navigate = useNavigate();
  const {
    activeTab,
    searchValue,
    statusValue,
    dateFrom,
    dateTo,
    currentPage,
    registrations,
    stats,
    isLoading,
    isError,
    errorMessage,
    hasNextPage,
    hasPreviousPage,
    setSearchValue,
    setStatusValue,
    setDateFrom,
    setDateTo,
    setActiveTab,
    goToNextPage,
    goToPreviousPage,
  } = useRegistrations();

  const handleAddManualRegistration = (): void => {
    navigate(ROUTES.MANUAL_REGISTRATION_STEP_1);
  };

  const handleOpenDetail = (id: string): void => {
    navigate(ROUTES.REGISTRATION_DETAIL(id));
  };

  const handleTabClick = (event: MouseEvent<HTMLButtonElement>): void => {
    const tabValue = event.currentTarget.dataset.tab;

    if (!tabValue) {
      return;
    }

    if (registrationFilterTabs.includes(tabValue as (typeof registrationFilterTabs)[number])) {
      setActiveTab(tabValue as (typeof registrationFilterTabs)[number]);
    }
  };

  return (
    <section className='space-y-4'>
      <div className='grid gap-3 md:grid-cols-3'>
        <article className='rounded-lg border border-border bg-surface p-4'>
          <p className='text-sm text-text-muted'>Total Registrations</p>
          <p className='mt-2 text-2xl font-semibold text-text-primary'>{stats.total}</p>
        </article>
        <article className='rounded-lg border border-l-4 border-l-amber-500 border-border bg-surface p-4'>
          <p className='text-sm text-text-muted'>Pending Review</p>
          <p className='mt-2 text-2xl font-semibold text-text-primary'>{stats.pending}</p>
        </article>
        <article className='rounded-lg border border-border bg-surface p-4'>
          <p className='text-sm text-text-muted'>Approved</p>
          <p className='mt-2 text-2xl font-semibold text-text-primary'>{stats.approved}</p>
        </article>
      </div>

      <section className='rounded-lg border border-border bg-surface p-2'>
        <div className='flex flex-wrap gap-2'>
          {registrationFilterTabs.map(tab => (
            <button
              key={tab}
              type='button'
              data-tab={tab}
              onClick={handleTabClick}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition',
                tab === activeTab ? 'bg-primary text-white' : 'bg-surface-muted text-text-primary hover:bg-accent'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      <RegistrationFilters
        searchValue={searchValue}
        statusValue={statusValue}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onSearchChange={setSearchValue}
        onStatusChange={setStatusValue}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onAddManualRegistration={handleAddManualRegistration}
      />

      {isError ? (
        <section className='rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive'>
          {errorMessage}
        </section>
      ) : (
        <RegistrationTable registrations={registrations} isLoading={isLoading} onOpenDetail={handleOpenDetail} />
      )}

      <section className='flex items-center justify-between rounded-lg border border-border bg-surface p-4'>
        <p className='text-sm text-text-muted'>Page {currentPage}</p>
        <div className='flex gap-2'>
          <Button type='button' variant='outline' disabled={!hasPreviousPage || isLoading} onClick={goToPreviousPage}>
            Previous
          </Button>
          <Button type='button' variant='outline' disabled={!hasNextPage || isLoading} onClick={goToNextPage}>
            Next
          </Button>
        </div>
      </section>
    </section>
  );
};
