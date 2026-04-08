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
    currentPage,
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
    <section className='wf-list-shell'>
      <header className='relative overflow-hidden rounded-3xl border border-primary/20 bg-[linear-gradient(120deg,#0d4ea8_0%,#2a7ddb_45%,#7fc5ff_100%)] p-5 text-white md:p-6'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,rgba(255,255,255,0.32),transparent_42%)]'
        />
        <div className='relative flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[2px] text-blue-100'>Registration Operations</p>
            <h2 className='mt-1 text-2xl font-extrabold tracking-tight text-white'>Registrations</h2>
            <p className='text-sm text-blue-50/90'>Review approvals, check sources, and manage manual entries.</p>
          </div>
          <Button
            type='button'
            className='h-10 rounded-xl border border-[#0b1f3a] bg-[#0b1f3a] text-white shadow-[0_12px_24px_rgba(8,24,46,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#08182e] hover:shadow-[0_16px_30px_rgba(8,24,46,0.45)]'
            onClick={handleAddManualRegistration}
          >
            Add Manual Registration
          </Button>
        </div>
      </header>

      <div className='wf-stat-grid-3'>
        <article className='wf-stat-card border-primary/15 bg-white'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Total Registrations</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{stats.total}</p>
        </article>
        <article className='wf-stat-card border-amber-300/60 bg-[linear-gradient(140deg,#fff9ef_0%,#fff2d8_100%)]'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-amber-700'>Pending Review</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-amber-900'>{stats.pending}</p>
        </article>
        <article className='wf-stat-card border-primary/15 bg-white'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Approved</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{stats.approved}</p>
        </article>
      </div>

      <section className='wf-tabs-panel border-primary/15 bg-white/80 shadow-[0_10px_24px_rgba(19,87,167,0.08)] backdrop-blur'>
        <div className='flex flex-wrap gap-2'>
          {registrationFilterTabs.map(tab => (
            <button
              key={tab}
              type='button'
              data-tab={tab}
              onClick={handleTabClick}
              className={cn('wf-filter-tab', tab === activeTab ? 'wf-filter-tab-active' : '')}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      <RegistrationFilters searchValue={searchValue} onSearchChange={setSearchValue} />

      {isError ? (
        <section className='rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive'>
          {errorMessage}
        </section>
      ) : (
        <RegistrationTable registrations={registrations} isLoading={isLoading} onOpenDetail={handleOpenDetail} />
      )}

      <section className='wf-pagination-panel'>
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
