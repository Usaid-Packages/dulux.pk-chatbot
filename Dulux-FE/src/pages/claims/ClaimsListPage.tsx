import type { JSX } from 'react';

import { CLAIM_STATUS_TABS, ClaimsTable } from '#/components/claims';
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
import { useClaims } from '#/hooks/claims';
import { CLAIM_ISSUE_TYPES } from '#/types/claims.types';

const PAGE_SIZE = 10;

const STAT_CARD_STYLES = [
  'border-border',
  'border-l-4 border-l-status-pending-text',
  'border-border',
  'border-border',
] as const;

/**
 * ClaimsListPage renders the end-to-end claims queue with filtering, tabs, stats, and pagination.
 *
 * @returns Claims list page.
 */
export const ClaimsListPage = (): JSX.Element => {
  const { claimsQuery, filters, setStatusFilter, setIssueTypeFilter, setFromDate, setToDate, setPage } = useClaims();

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

  return (
    <main className='space-y-5'>
      <section className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        {[
          { label: 'Total Claims', value: claimsData?.stats.totalClaims ?? 0 },
          { label: 'Pending CS Review', value: claimsData?.stats.pendingReview ?? 0 },
          { label: 'Forwarded to Quality', value: claimsData?.stats.forwardedToQuality ?? 0 },
          { label: 'Resolved', value: claimsData?.stats.resolved ?? 0 },
        ].map((card, index) => (
          <article key={card.label} className={`rounded-lg border bg-surface p-4 ${STAT_CARD_STYLES[index]}`}>
            <p className='text-sm text-text-muted'>{card.label}</p>
            <p className='mt-1 text-2xl font-bold text-text-primary'>{card.value}</p>
          </article>
        ))}
      </section>

      <section className='rounded-lg border border-border bg-surface p-4'>
        <div className='flex flex-wrap gap-2'>
          {CLAIM_STATUS_TABS.map(tab => {
            const isActive = filters.status === tab.value;
            const handleTabClick = (): void => setStatusFilter(tab.value);

            return (
              <Button
                key={tab.value}
                type='button'
                variant={isActive ? 'default' : 'outline'}
                className='h-8 px-3 text-xs'
                onClick={handleTabClick}
              >
                {tab.label}
              </Button>
            );
          })}
        </div>
      </section>

      <section className='rounded-lg border border-border bg-surface p-4'>
        <div className='grid gap-3 md:grid-cols-4'>
          <div className='space-y-1'>
            <label htmlFor='claim-from-date' className='text-xs font-medium text-text-muted'>
              From Date
            </label>
            <Input
              id='claim-from-date'
              type='date'
              value={filters.fromDate ?? ''}
              onChange={event => setFromDate(event.target.value || undefined)}
            />
          </div>

          <div className='space-y-1'>
            <label htmlFor='claim-to-date' className='text-xs font-medium text-text-muted'>
              To Date
            </label>
            <Input
              id='claim-to-date'
              type='date'
              value={filters.toDate ?? ''}
              onChange={event => setToDate(event.target.value || undefined)}
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
                    {issueType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {claimsQuery.isLoading ? (
        <section className='space-y-2 rounded-lg border border-border bg-surface p-4'>
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
          <div className='flex items-center justify-between rounded-lg border border-border bg-surface p-4'>
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
    </main>
  );
};
