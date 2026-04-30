import * as React from 'react';

import { QUALITY_STATUS_TABS, QualityQueueTable } from '#/components/quality';
import { ListStateBlock, PaginationFooter } from '#/components/shared';
import { Input } from '#/components/ui';
import { LIST_PAGE_SIZE } from '#/constants';
import { useDebouncedValue, useQualityQueue } from '#/hooks';
import { cn } from '#/utils';

/**
 * QualityListPage renders the quality review queue with status tabs and summary stats.
 *
 * @returns Quality list page.
 */
export const QualityListPage = (): React.JSX.Element => {
  const { qualityQueueQuery, cardCountsQuery, filters, searchValue, setStatusFilter, setSearch, setPage } =
    useQualityQueue();
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

  const handleSearchChange = (value: string): void => {
    setSearch(value);
  };

  return (
    <main className='wf-list-shell'>
      <section className='wf-stat-grid-4'>
        {[
          { label: 'Total In Queue', value: cardCountsQuery.data?.totalInQueue ?? 0 },
          { label: 'QA Review', value: cardCountsQuery.data?.qaReview ?? 0 },
          { label: 'QA Approved', value: cardCountsQuery.data?.qaApproved ?? 0 },
          { label: 'QA Rejected', value: cardCountsQuery.data?.qaRejected ?? 0 },
        ].map(card => (
          <article key={card.label} className='wf-stat-card border-primary/15 bg-white'>
            <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>{card.label}</p>
            <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{card.value}</p>
          </article>
        ))}
      </section>

      <section className='wf-tabs-panel border-primary/15 bg-white ui-shadow-panel'>
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
            onChange={event => handleSearchChange(event.target.value)}
            placeholder='Search by Customer Name or Customer ID'
            className='h-10 w-[240px] min-w-[240px] rounded-xl border-primary/25 bg-white'
            aria-label='Search quality queue'
          />
        </div>
      </section>

      <ListStateBlock
        isLoading={qualityQueueQuery.isLoading}
        isError={qualityQueueQuery.isError}
        isEmpty={filteredQueueItems.length === 0}
        errorTitle='Failed to load quality queue'
        errorDescription={qualityQueueQuery.error?.message ?? 'Unable to fetch quality queue.'}
        emptyTitle='No claims in quality queue'
        emptyDescription='There are no matching records for the selected status.'
      >
        <>
          <QualityQueueTable items={filteredQueueItems} />
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
    </main>
  );
};
