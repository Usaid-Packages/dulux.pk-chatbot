import * as React from 'react';

import { useSearchParams } from 'react-router-dom';

import { AddClaimModal, CLAIM_STATUS_TABS, ClaimsTable } from '#/components/claims';
import {
  Button,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '#/components/ui';
import { getClaimIssueTypeLabel } from '#/constants';
import { useClaims } from '#/hooks/claims';
import { CLAIM_ISSUE_TYPES } from '#/types/claims.types';
import type { CreateClaimPayload } from '#/types/claims.types';
import { cn } from '#/utils';

const PAGE_SIZE = 10;

const STAT_CARD_STYLES = ['', '', '', ''] as const;

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
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

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
          { label: 'Pending CS Review', value: cardCountsQuery.data?.pendingCsReview ?? 0 },
          { label: 'Forwarded to Quality', value: cardCountsQuery.data?.forwardedToQuality ?? 0 },
          { label: 'Resolved', value: cardCountsQuery.data?.resolved ?? 0 },
        ].map((card, index) => (
          <article key={card.label} className={`wf-stat-card border-primary/15 bg-white ${STAT_CARD_STYLES[index]}`}>
            <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>{card.label}</p>
            <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{card.value}</p>
          </article>
        ))}
      </section>

      <section className='wf-tabs-panel border-primary/15 bg-white shadow-[0_10px_24px_rgba(19,87,167,0.08)]'>
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

      {claimsQuery.isLoading ? (
        <section className='space-y-2 wf-card wf-card-p4'>
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
        </section>
      ) : null}

      {claimsQuery.isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Failed to load claims</EmptyTitle>
            <EmptyDescription>{claimsQuery.error?.message ?? 'Unable to fetch claims.'}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {!claimsQuery.isLoading && !claimsQuery.isError && claimsItems.length === 0 ? (
        <Empty>
          <EmptyContent>
            <EmptyHeader>
              <EmptyTitle>No claims found</EmptyTitle>
              <EmptyDescription>Adjust filters to see more records.</EmptyDescription>
            </EmptyHeader>
          </EmptyContent>
        </Empty>
      ) : null}

      {!claimsQuery.isLoading && !claimsQuery.isError && claimsItems.length > 0 ? (
        <>
          <ClaimsTable claims={claimsItems} />
          <div className='wf-pagination-panel'>
            <p className='text-sm text-text-muted'>
              Page {filters.page} of {totalPages}
            </p>
            <div className='flex w-full gap-2 sm:w-auto'>
              <Button type='button' variant='outline' onClick={handlePrevPage} disabled={filters.page <= 1}>
                Previous
              </Button>
              <Button type='button' variant='outline' onClick={handleNextPage} disabled={filters.page >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}

      <AddClaimModal
        isOpen={isAddClaimModalOpen}
        isSubmitting={isCreateClaimPending}
        onClose={closeAddClaimModal}
        onSubmit={submitAddClaim}
      />
    </main>
  );
};
