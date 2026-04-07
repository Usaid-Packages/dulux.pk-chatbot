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
import { cn } from '#/utils';

const PAGE_SIZE = 10;

const STAT_CARD_STYLES = [
  '',
  'border-amber-300/60 bg-[linear-gradient(140deg,#fff9ef_0%,#fff2d8_100%)]',
  '',
  '',
] as const;

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
      <header className='relative overflow-hidden rounded-3xl border border-primary/20 bg-[linear-gradient(120deg,#0d4ea8_0%,#2a7ddb_45%,#7fc5ff_100%)] p-5 text-white shadow-[0_18px_42px_rgba(18,79,165,0.33)] md:p-6'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,rgba(255,255,255,0.32),transparent_42%)]'
        />
        <div className='relative flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[2px] text-blue-100'>Claims Operations</p>
            <h2 className='mt-1 text-2xl font-extrabold tracking-tight text-white'>Claims</h2>
            <p className='text-sm text-blue-50/90'>
              Review incoming claims, route workflows, and resolve with full traceability.
            </p>
          </div>
          <Button
            type='button'
            className='h-10 rounded-xl border border-[#0b1f3a] bg-[#0b1f3a] text-white shadow-[0_12px_24px_rgba(8,24,46,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#08182e] hover:shadow-[0_16px_30px_rgba(8,24,46,0.45)]'
            onClick={openAddClaimModal}
          >
            Add Claim
          </Button>
        </div>
      </header>

      <section className='wf-stat-grid-4'>
        {[
          { label: 'Total Claims', value: claimsData?.stats.totalClaims ?? 0 },
          { label: 'Pending CS Review', value: claimsData?.stats.pendingReview ?? 0 },
          { label: 'Forwarded to Quality', value: claimsData?.stats.forwardedToQuality ?? 0 },
          { label: 'Resolved', value: claimsData?.stats.resolved ?? 0 },
        ].map((card, index) => (
          <article
            key={card.label}
            className={`wf-stat-card border-primary/15 bg-[linear-gradient(140deg,#ffffff_0%,#eef6ff_100%)] ${STAT_CARD_STYLES[index]}`}
          >
            <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>{card.label}</p>
            <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{card.value}</p>
          </article>
        ))}
      </section>

      <section className='wf-tabs-panel border-primary/15 bg-white/80 shadow-[0_10px_24px_rgba(19,87,167,0.08)] backdrop-blur'>
        <div className='flex flex-wrap gap-2'>
          {CLAIM_STATUS_TABS.map(tab => {
            const isActive = filters.status === tab.value;
            const handleTabClick = (): void => setStatusFilter(tab.value);

            return (
              <button
                key={tab.value}
                type='button'
                className={cn('wf-filter-tab', isActive ? 'wf-filter-tab-active' : '')}
                onClick={handleTabClick}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className='wf-toolbar-panel border-primary/15 bg-[linear-gradient(170deg,#ffffff_0%,#f1f7ff_100%)] shadow-[0_10px_24px_rgba(19,87,167,0.08)]'>
        <div className='grid gap-3 md:grid-cols-[2fr_1fr]'>
          <Input
            id='claim-search'
            type='search'
            placeholder='Search by registration or phone number'
            value={filters.search ?? ''}
            className='h-11 rounded-xl border-primary/25 bg-white'
            onChange={event => setSearch(event.target.value)}
          />

          <Select
            value={filters.issueType}
            onValueChange={value => setIssueTypeFilter(value as (typeof CLAIM_ISSUE_TYPES)[number] | 'all')}
          >
            <SelectTrigger id='claim-issue-type' className='h-11 rounded-xl border-primary/25 bg-white'>
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
