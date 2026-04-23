import * as React from 'react';

import { useSearchParams } from 'react-router-dom';

import { AddClaimModal, CLAIM_STATUS_TABS, ClaimsTable } from '#/components/claims';
import { ListStateBlock, PaginationFooter } from '#/components/shared';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui';
import { LIST_PAGE_SIZE, getClaimIssueTypeLabel } from '#/constants';
import { useClaims } from '#/hooks/claims';
import { CLAIM_ISSUE_TYPES } from '#/types/claims.types';
import type { CreateClaimPayload } from '#/types/claims.types';
import { cn } from '#/utils';

/**
 * ClaimsListPage renders the end-to-end claims queue with filtering, tabs, stats, and pagination.
 *
 * @returns Claims list page.
 */
export const ClaimsListPage = (): React.JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    claimsQuery,
    cardCountsQuery,
    filters,
    setStatusFilter,
    setIssueTypeFilter,
    setSearch,
    setPage,
    handleCreateClaim,
    isCreateClaimPending,
  } = useClaims();
  const [isAddClaimModalOpen, setAddClaimModalOpen] = React.useState(false);
  const shouldOpenCreateModal = searchParams.get('createClaim') === '1';

  const claimsData = claimsQuery.data;
  const claimsItems = claimsData?.items ?? [];
  const totalItems = claimsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / LIST_PAGE_SIZE));

  const handlePrevPage = (): void => {
    if (filters.page > 1) {
      setPage(filters.page - 1);
    }
  };

  const handleNextPage = (): void => {
    if (filters.page < totalPages) {
      setPage(filters.page + 1);
    }
  };

  const closeAddClaimModal = (): void => {
    setAddClaimModalOpen(false);
    if (shouldOpenCreateModal) {
      setSearchParams(previous => {
        const nextParams = new URLSearchParams(previous);
        nextParams.delete('createClaim');
        return nextParams;
      });
    }
  };

  React.useEffect(() => {
    if (shouldOpenCreateModal) {
      setAddClaimModalOpen(true);
    }
  }, [shouldOpenCreateModal]);

  const submitAddClaim = (payload: CreateClaimPayload): void => {
    handleCreateClaim(payload, {
      onSuccess: closeAddClaimModal,
    });
  };

  return (
    <main className='wf-list-shell'>
      <section className='wf-stat-grid-4'>
        {[
          { label: 'Total Claims', value: cardCountsQuery.data?.totalClaims ?? 0 },
          { label: 'Pending', value: cardCountsQuery.data?.submitted ?? 0 },
          { label: 'Approved', value: cardCountsQuery.data?.approved ?? 0 },
          { label: 'Rejected', value: cardCountsQuery.data?.rejected ?? 0 },
        ].map(card => (
          <article key={card.label} className='wf-stat-card border-primary/15 bg-white'>
            <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>{card.label}</p>
            <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{card.value}</p>
          </article>
        ))}
      </section>

      <section className='wf-tabs-panel border-primary/15 bg-white ui-shadow-panel'>
        <div className='space-y-3'>
          <div className='flex items-center gap-3 overflow-x-auto'>
            <div className='flex min-w-0 flex-1 items-center gap-2 overflow-x-auto'>
              {CLAIM_STATUS_TABS.map(tab => {
                const isActive = filters.status === tab.value;
                const handleTabClick = (): void => setStatusFilter(tab.value);

                return (
                  <button
                    key={tab.value}
                    type='button'
                    className={cn('wf-filter-tab shrink-0', isActive ? 'wf-filter-tab-active' : '')}
                    onClick={handleTabClick}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className='flex items-center gap-2'>
              <Input
                id='claim-search'
                type='search'
                placeholder='Search by registration or phone number'
                value={filters.search ?? ''}
                className='h-10 w-[220px] min-w-[220px] rounded-xl border-primary/25 bg-white'
                onChange={event => setSearch(event.target.value)}
              />
              <Select
                value={filters.issueType}
                onValueChange={value => setIssueTypeFilter(value as (typeof CLAIM_ISSUE_TYPES)[number] | 'all')}
              >
                <SelectTrigger
                  id='claim-issue-type'
                  className='h-10 w-[180px] min-w-[180px] rounded-xl border-primary/25 bg-white'
                >
                  <SelectValue placeholder='All issue types' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All issue types</SelectItem>
                  {CLAIM_ISSUE_TYPES.map(issueType => (
                    <SelectItem key={issueType} value={issueType}>
                      {getClaimIssueTypeLabel(issueType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      <ListStateBlock
        isLoading={claimsQuery.isLoading}
        isError={claimsQuery.isError}
        isEmpty={claimsItems.length === 0}
        errorTitle='Failed to load claims'
        errorDescription={claimsQuery.error?.message ?? 'Unable to fetch claims.'}
        emptyTitle='No claims found'
        emptyDescription='Adjust filters to see more records.'
      >
        <>
          <ClaimsTable claims={claimsItems} />
          <PaginationFooter
            currentPage={filters.page}
            totalPages={totalPages}
            disablePrevious={filters.page <= 1}
            disableNext={filters.page >= totalPages}
            onPreviousPage={handlePrevPage}
            onNextPage={handleNextPage}
          />
        </>
      </ListStateBlock>

      <AddClaimModal
        isOpen={isAddClaimModalOpen}
        isSubmitting={isCreateClaimPending}
        onClose={closeAddClaimModal}
        onSubmit={submitAddClaim}
      />
    </main>
  );
};
