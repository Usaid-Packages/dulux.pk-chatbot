import type { JSX, MouseEvent } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';

import { RegistrationTable } from '#/components/registrations';
import { Button, Input } from '#/components/ui';
import { REGISTRATION_FILTER_TAB_LABELS, ROUTES } from '#/constants';
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
  const location = useLocation();
  const {
    activeTab,
    searchValue,
    currentPage,
    totalPages,
    registrations,
    stats,
    isLoading,
    isError,
    errorMessage,
    hasNextPage,
    hasPreviousPage,
    setSearchValue,
    setActiveTab,
    goToNextPage,
    goToPreviousPage,
  } = useRegistrations();

  const handleOpenDetail = (id: string): void => {
    navigate(`${ROUTES.REGISTRATION_DETAIL(id)}${location.search}`);
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
    <section className='wf-list-shell'>
      <div className='wf-stat-grid-3'>
        <article className='wf-stat-card border-primary/15 bg-white'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Total Registrations</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{stats.total}</p>
        </article>
        <article className='wf-stat-card border-primary/15 bg-white'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Pending Review</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{stats.pending}</p>
        </article>
        <article className='wf-stat-card border-primary/15 bg-white'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Approved</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{stats.approved}</p>
        </article>
      </div>

      <section className='wf-tabs-panel border-primary/15 bg-white shadow-[0_10px_24px_rgba(19,87,167,0.08)]'>
        <div className='flex items-center gap-3 overflow-x-auto'>
          <div className='flex min-w-0 flex-1 items-center gap-2 overflow-x-auto'>
            {registrationFilterTabs.map(tab => (
              <button
                key={tab}
                type='button'
                data-tab={tab}
                onClick={handleTabClick}
                className={cn('wf-filter-tab shrink-0', tab === activeTab ? 'wf-filter-tab-active' : '')}
              >
                {REGISTRATION_FILTER_TAB_LABELS[tab]}
              </button>
            ))}
          </div>
          <Input
            type='search'
            value={searchValue}
            onChange={event => setSearchValue(event.target.value)}
            placeholder='Search by registration code, customer, or phone'
            className='h-10 w-[240px] min-w-[240px] rounded-xl border-primary/25 bg-white'
            aria-label='Search registrations'
          />
        </div>
      </section>

      {isError ? (
        <section className='rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive'>
          {errorMessage}
        </section>
      ) : (
        <RegistrationTable registrations={registrations} isLoading={isLoading} onOpenDetail={handleOpenDetail} />
      )}

      <section className='wf-pagination-panel'>
        <p className='text-sm text-text-muted'>
          Page {currentPage} of {totalPages}
        </p>
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
