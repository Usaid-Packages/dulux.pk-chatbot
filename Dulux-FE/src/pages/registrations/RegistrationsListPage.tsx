import type { JSX, MouseEvent } from 'react';

import { RegistrationEditModal, RegistrationTable } from '#/components/registrations';
import { ListStateBlock, PaginationFooter } from '#/components/shared';
import { Input } from '#/components/ui';
import { REGISTRATION_FILTER_TAB_LABELS } from '#/constants';
import { useRegistrationsListPageController } from '#/hooks/registrations';
import { registrationFilterTabs } from '#/types/registrations';
import { cn } from '#/utils';

/**
 * RegistrationsListPage renders listing, filters, tabs, and pagination.
 *
 * @returns Registrations list route content.
 */
export const RegistrationsListPage = (): JSX.Element => {
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
    isEditModalOpen,
    editRegistrationIsLoading,
    editRegistrationIsSubmitting,
    editRegistrationData,
    handleOpenDetail,
    openEditModal,
    closeEditModal,
    handleEditSubmit,
  } = useRegistrationsListPageController();

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
      <div className='wf-stat-grid-4'>
        <article className='wf-stat-card border-primary/15 bg-white'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Total Registrations</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{stats.total}</p>
        </article>
        <article className='wf-stat-card border-primary/15 bg-white'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Pending</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{stats.pending}</p>
        </article>
        <article className='wf-stat-card border-primary/15 bg-white'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Approved</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{stats.approved}</p>
        </article>
        <article className='wf-stat-card border-primary/15 bg-white'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Rejected</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{stats.rejected}</p>
        </article>
      </div>

      <section className='wf-tabs-panel border-primary/15 bg-white ui-shadow-panel'>
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

      <ListStateBlock
        isLoading={isLoading}
        isError={isError}
        isEmpty={registrations.length === 0}
        errorTitle='Failed to load registrations'
        errorDescription={errorMessage}
        emptyTitle='No registrations found'
        emptyDescription='Adjust filters to see more records.'
      >
        <>
          <RegistrationTable
            registrations={registrations}
            isLoading={isLoading}
            onOpenDetail={handleOpenDetail}
            onOpenEdit={openEditModal}
          />

          <PaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            disablePrevious={!hasPreviousPage || isLoading}
            disableNext={!hasNextPage || isLoading}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
          />
        </>
      </ListStateBlock>

      <RegistrationEditModal
        isOpen={isEditModalOpen}
        isLoading={editRegistrationIsLoading}
        isSubmitting={editRegistrationIsSubmitting}
        registration={editRegistrationData}
        onClose={closeEditModal}
        onSubmit={handleEditSubmit}
      />
    </section>
  );
};
