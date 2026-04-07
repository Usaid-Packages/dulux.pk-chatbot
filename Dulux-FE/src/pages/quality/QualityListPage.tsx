import type { JSX } from 'react';

import { QUALITY_STATUS_TABS, QualityQueueTable } from '#/components/quality';
import { Button, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { useQualityQueue } from '#/hooks/quality';

const PAGE_SIZE = 10;

const STAT_CARD_STYLES = ['', 'wf-stat-card-highlight-purple', '', ''] as const;

/**
 * QualityListPage renders the quality review queue with status tabs and summary stats.
 *
 * @returns Quality list page.
 */
export const QualityListPage = (): JSX.Element => {
  const { qualityQueueQuery, filters, setStatusFilter, setPage } = useQualityQueue();

  const queueData = qualityQueueQuery.data;
  const queueItems = queueData?.items ?? [];
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
      <header className='rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4'>
        <h2 className='text-2xl font-semibold text-text-primary'>Quality Review Queue</h2>
        <p className='text-sm text-text-muted'>
          Track QA workload and move claims through technical assessment faster.
        </p>
      </header>

      <section className='wf-stat-grid-4'>
        {[
          { label: 'Total In Queue', value: queueData?.stats.totalInQueue ?? 0 },
          { label: 'Awaiting Review', value: queueData?.stats.awaitingReview ?? 0 },
          { label: 'Info Requested', value: queueData?.stats.infoRequested ?? 0 },
          { label: 'Resolved Today', value: queueData?.stats.resolvedToday ?? 0 },
        ].map((card, index) => (
          <article key={card.label} className={`wf-stat-card ${STAT_CARD_STYLES[index]}`}>
            <p className='text-sm text-text-muted'>{card.label}</p>
            <p className='mt-1 text-2xl font-bold text-text-primary'>{card.value}</p>
          </article>
        ))}
      </section>

      <section className='wf-tabs-panel wf-tabs-panel-contrast'>
        <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
          {QUALITY_STATUS_TABS.map(tab => {
            const isActive = filters.status === tab.value;
            const tabCount =
              tab.value === 'all'
                ? (queueData?.stats.totalInQueue ?? 0)
                : tab.value === 'forwarded'
                  ? (queueData?.stats.awaitingReview ?? 0)
                  : tab.value === 'infoRequested'
                    ? (queueData?.stats.infoRequested ?? 0)
                    : (queueData?.stats.resolvedToday ?? 0);

            const handleTabClick = (): void => {
              setStatusFilter(tab.value);
            };

            return (
              <Button
                key={tab.value}
                type='button'
                variant='ghost'
                className={isActive ? 'wf-filter-tab wf-filter-tab-active' : 'wf-filter-tab'}
                onClick={handleTabClick}
              >
                <span>{tab.label}</span>
                <span className='rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary'>
                  {tabCount}
                </span>
              </Button>
            );
          })}
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

      {!qualityQueueQuery.isLoading && !qualityQueueQuery.isError && queueItems.length === 0 ? (
        <Empty>
          <EmptyContent>
            <EmptyHeader>
              <EmptyTitle>No claims in quality queue</EmptyTitle>
              <EmptyDescription>There are no matching records for the selected status.</EmptyDescription>
            </EmptyHeader>
          </EmptyContent>
        </Empty>
      ) : null}

      {!qualityQueueQuery.isLoading && !qualityQueueQuery.isError && queueItems.length > 0 ? (
        <>
          <QualityQueueTable items={queueItems} />
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
    </main>
  );
};
