/* eslint import/order: off */
import type { JSX } from 'react';

import { Button, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { QUALITY_STATUS_TABS, QualityQueueTable } from '#/components/quality';
import { useQualityQueue } from '#/hooks/quality';

const PAGE_SIZE = 10;

const STAT_CARD_STYLES = [
  'border-border',
  'border-l-4 border-l-quality-highlight',
  'border-border',
  'border-border',
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
    <main className='space-y-5'>
      <section className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        {[
          { label: 'Total In Queue', value: queueData?.stats.totalInQueue ?? 0 },
          { label: 'Awaiting Review', value: queueData?.stats.awaitingReview ?? 0 },
          { label: 'Info Requested', value: queueData?.stats.infoRequested ?? 0 },
          { label: 'Resolved Today', value: queueData?.stats.resolvedToday ?? 0 },
        ].map((card, index) => (
          <article key={card.label} className={`rounded-lg border bg-surface p-4 ${STAT_CARD_STYLES[index]}`}>
            <p className='text-sm text-text-muted'>{card.label}</p>
            <p className='mt-1 text-2xl font-bold text-text-primary'>{card.value}</p>
          </article>
        ))}
      </section>

      <section className='rounded-lg border border-border bg-surface p-4'>
        <div className='flex flex-wrap gap-2'>
          {QUALITY_STATUS_TABS.map(tab => {
            const isActive = filters.status === tab.value;

            const handleTabClick = (): void => {
              setStatusFilter(tab.value);
            };

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

      {qualityQueueQuery.isLoading ? (
        <section className='space-y-2 rounded-lg border border-border bg-surface p-4'>
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
