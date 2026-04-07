import type { JSX } from 'react';

import { QUALITY_STATUS_TABS, QualityQueueTable } from '#/components/quality';
import { Button, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { useQualityQueue } from '#/hooks/quality';
import { cn } from '#/utils';

const PAGE_SIZE = 10;

const STAT_CARD_STYLES = [
  '',
  'border-purple-300/60 bg-[linear-gradient(140deg,#f8f2ff_0%,#f0e3ff_100%)]',
  '',
  '',
] as const;

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
      <header className='relative overflow-hidden rounded-3xl border border-primary/20 bg-[linear-gradient(120deg,#0d4ea8_0%,#2a7ddb_45%,#7fc5ff_100%)] p-5 text-white shadow-[0_18px_42px_rgba(18,79,165,0.33)] md:p-6'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,rgba(255,255,255,0.32),transparent_42%)]'
        />
        <div className='relative'>
          <p className='text-xs font-semibold uppercase tracking-[2px] text-blue-100'>Quality Operations</p>
          <h2 className='mt-1 text-2xl font-extrabold tracking-tight text-white'>Quality Review Queue</h2>
          <p className='text-sm text-blue-50/90'>
            Track QA workload and move claims through technical assessment faster.
          </p>
        </div>
      </header>

      <section className='wf-stat-grid-4'>
        {[
          { label: 'Total In Queue', value: queueData?.stats.totalInQueue ?? 0 },
          { label: 'Awaiting Review', value: queueData?.stats.awaitingReview ?? 0 },
          { label: 'Info Requested', value: queueData?.stats.infoRequested ?? 0 },
          { label: 'Resolved Today', value: queueData?.stats.resolvedToday ?? 0 },
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
          {QUALITY_STATUS_TABS.map(tab => {
            const isActive = filters.status === tab.value;

            const handleTabClick = (): void => {
              setStatusFilter(tab.value);
            };

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
