import type { JSX } from 'react';
import { useState } from 'react';

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
import { CLAIM_ISSUE_TYPES, type CreateClaimPayload } from '#/types/claims.types';

const PAGE_SIZE = 10;

const STAT_CARD_STYLES = ['', 'wf-stat-card-highlight-amber', '', ''] as const;

/**
 * ClaimsListPage renders the end-to-end claims queue with filtering, tabs, stats, and pagination.
 *
 * @returns Claims list page.
 */
export const ClaimsListPage = (): JSX.Element => {
  const {
    claimsQuery,
    filters,
    setStatusFilter,
    setIssueTypeFilter,
    setSearch,
    setPage,
    handleCreateClaim,
    isCreateClaimPending,
  } = useClaims();
  const [isAddClaimModalOpen, setAddClaimModalOpen] = useState(false);

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

  const openAddClaimModal = (): void => setAddClaimModalOpen(true);

  const closeAddClaimModal = (): void => setAddClaimModalOpen(false);

  const submitAddClaim = (payload: CreateClaimPayload): void => {
    handleCreateClaim(payload, {
      onSuccess: closeAddClaimModal,
    });
  };

  return (
    <main className='wf-list-shell'>
      <header className='rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4'>
        <h2 className='text-2xl font-semibold text-text-primary'>Claims</h2>
        <p className='text-sm text-text-muted'>
          Review incoming claims, route workflows, and resolve with full traceability.
        </p>
      </header>

      <section className='wf-stat-grid-4'>
        {[
          { label: 'Total Claims', value: claimsData?.stats.totalClaims ?? 0 },
          { label: 'Pending CS Review', value: claimsData?.stats.pendingReview ?? 0 },
          { label: 'Forwarded to Quality', value: claimsData?.stats.forwardedToQuality ?? 0 },
          { label: 'Resolved', value: claimsData?.stats.resolved ?? 0 },
        ].map((card, index) => (
          <article key={card.label} className={`wf-stat-card ${STAT_CARD_STYLES[index]}`}>
            <p className='text-sm text-text-muted'>{card.label}</p>
            <p className='mt-1 text-2xl font-bold text-text-primary'>{card.value}</p>
          </article>
        ))}
      </section>

      <section className='wf-tabs-panel wf-tabs-panel-contrast'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex flex-wrap gap-2'>
            {CLAIM_STATUS_TABS.map(tab => {
              const isActive = filters.status === tab.value;
              const handleTabClick = (): void => setStatusFilter(tab.value);

              return (
                <Button
                  key={tab.value}
                  type='button'
                  variant='ghost'
                  className={isActive ? 'wf-filter-tab wf-filter-tab-active' : 'wf-filter-tab'}
                  onClick={handleTabClick}
                >
                  {tab.label}
                </Button>
              );
            })}
          </div>
          <Button type='button' onClick={openAddClaimModal}>
            Add Claim
          </Button>
        </div>
      </section>

      <section className='wf-toolbar-panel wf-toolbar-panel-contrast'>
        <div className='grid gap-3 md:grid-cols-4'>
          <div className='space-y-1'>
            <label htmlFor='claim-search' className='text-xs font-medium text-text-muted'>
              Search
            </label>
            <Input
              id='claim-search'
              type='search'
              placeholder='Search by registration or phone number'
              value={filters.search ?? ''}
              onChange={event => setSearch(event.target.value)}
            />
          </div>

          <div className='space-y-1'>
            <label htmlFor='claim-issue-type' className='text-xs font-medium text-text-muted'>
              Issue Type
            </label>
            <Select
              value={filters.issueType}
              onValueChange={value => setIssueTypeFilter(value as (typeof CLAIM_ISSUE_TYPES)[number] | 'all')}
            >
              <SelectTrigger id='claim-issue-type'>
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
            <div className='flex gap-2'>
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
