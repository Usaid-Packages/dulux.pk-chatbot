import * as React from 'react';

import { QUALITY_STATUS_TABS, QualityQueueTable } from '#/components/quality';
import {
  Button,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Input,
  Skeleton,
} from '#/components/ui';
import { useDebouncedValue, useQualityQueue } from '#/hooks';
import { cn } from '#/utils';

const PAGE_SIZE = 10;

const STAT_CARD_STYLES = ['', '', '', ''] as const;

/**
 * QualityListPage renders the quality review queue with status tabs and summary stats.
 *
 * @returns Quality list page.
 */
export const QualityListPage = (): React.JSX.Element => {
  const { qualityQueueQuery, cardCountsQuery, filters, setStatusFilter, setPage } = useQualityQueue();
  const [searchValue, setSearchValue] = React.useState<string>('');
  const debouncedSearchValue = useDebouncedValue(searchValue);

  const queueData = qualityQueueQuery.data;
  const queueItems = queueData?.items ?? [];
  const filteredQueueItems = React.useMemo(() => {
    const normalizedSearch = debouncedSearchValue.trim().toLowerCase();
    if (!normalizedSearch) {
      return queueItems;
    }

    return queueItems.filter(item => {
      return (
        item.claimNumber.toLowerCase().includes(normalizedSearch) ||
        item.customerName.toLowerCase().includes(normalizedSearch) ||
        item.city.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [debouncedSearchValue, queueItems]);
  const totalItems = queueData?.total ?? 0;
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
    <main className='wf-list-shell'>
      <section className='wf-stat-grid-4'>
        {[
          { label: 'Total In Queue', value: cardCountsQuery.data?.totalInQueue ?? 0 },
          { label: 'Awaiting Review', value: cardCountsQuery.data?.awaitingReview ?? 0 },
          { label: 'Info Requested', value: cardCountsQuery.data?.infoRequested ?? 0 },
          { label: 'Resolved Today', value: cardCountsQuery.data?.resolvedToday ?? 0 },
        ].map((card, index) => (
          <article key={card.label} className={`wf-stat-card border-primary/15 bg-white ${STAT_CARD_STYLES[index]}`}>
            <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>{card.label}</p>
            <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{card.value}</p>
          </article>
        ))}
      </section>

      <section className='wf-tabs-panel border-primary/15 bg-white shadow-[0_10px_24px_rgba(19,87,167,0.08)]'>
        <div className='flex items-center gap-3 overflow-x-auto'>
          <div className='flex min-w-0 flex-1 items-center gap-2 overflow-x-auto'>
            {QUALITY_STATUS_TABS.map(tab => {
              const isActive = filters.status === tab.value;

              const handleTabClick = (): void => {
                setStatusFilter(tab.value);
              };

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
          <Input
            type='search'
            value={searchValue}
            onChange={event => setSearchValue(event.target.value)}
            placeholder='Search by customer or city'
            className='h-10 w-[240px] min-w-[240px] rounded-xl border-primary/25 bg-white'
            aria-label='Search quality queue'
          />
        </div>
      </section>

      {qualityQueueQuery.isLoading ? (
        <section className='space-y-2 wf-card wf-card-p4'>
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
        </section>
      ) : null}

      {qualityQueueQuery.isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Failed to load quality queue</EmptyTitle>
            <EmptyDescription>{qualityQueueQuery.error?.message ?? 'Unable to fetch quality queue.'}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {!qualityQueueQuery.isLoading && !qualityQueueQuery.isError && filteredQueueItems.length === 0 ? (
        <Empty>
          <EmptyContent>
            <EmptyHeader>
              <EmptyTitle>No claims in quality queue</EmptyTitle>
              <EmptyDescription>There are no matching records for the selected status.</EmptyDescription>
            </EmptyHeader>
          </EmptyContent>
        </Empty>
      ) : null}

      {!qualityQueueQuery.isLoading && !qualityQueueQuery.isError && filteredQueueItems.length > 0 ? (
        <>
          <QualityQueueTable items={filteredQueueItems} />
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
    </main>
  );
};
