import type { JSX } from 'react';

import { AuditLogDetailDialog, AuditLogsFilters, AuditLogsTable } from '#/components/auditLogs';
import { Button, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { useAuditLogs } from '#/hooks/auditLogs';
import { getApiErrorMessage } from '#/utils';

const PAGE_SIZE = 10;

/**
 * AuditLogsPage renders admin audit logs list, filters, and on-demand detail inspection.
 *
 * @returns Audit logs screen.
 */
export const AuditLogsPage = (): JSX.Element => {
  const {
    filters,
    auditLogsQuery,
    detailQuery,
    selectedAuditLogId,
    setActionFilter,
    setOrdering,
    setActorFilter,
    setModelLabelFilter,
    setObjectIdFilter,
    setDateFromFilter,
    setDateToFilter,
    setSearch,
    setPage,
    openDetail,
    closeDetail,
  } = useAuditLogs();

  const auditLogsData = auditLogsQuery.data;
  const auditLogsItems = auditLogsData?.items ?? [];
  const totalItems = auditLogsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const totalCreate = auditLogsItems.filter(item => item.action === 'CREATE').length;
  const totalUpdate = auditLogsItems.filter(item => item.action === 'UPDATE').length;
  const totalDelete = auditLogsItems.filter(item => item.action === 'DELETE').length;

  const handlePreviousPage = (): void => {
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
        <article className='wf-stat-card border-primary/15 bg-white'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Total Logs</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{totalItems}</p>
        </article>
        <article className='wf-stat-card border-primary/15 bg-white'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Create Events</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{totalCreate}</p>
        </article>
        <article className='wf-stat-card border-primary/15 bg-white'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Update Events</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{totalUpdate}</p>
        </article>
        <article className='wf-stat-card border-primary/15 bg-white'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Delete Events</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{totalDelete}</p>
        </article>
      </section>

      <AuditLogsFilters
        filters={filters}
        onSetAction={setActionFilter}
        onSetOrdering={setOrdering}
        onSetActor={setActorFilter}
        onSetModelLabel={setModelLabelFilter}
        onSetObjectId={setObjectIdFilter}
        onSetDateFrom={setDateFromFilter}
        onSetDateTo={setDateToFilter}
        onSetSearch={setSearch}
      />

      {auditLogsQuery.isLoading ? (
        <section className='space-y-2 wf-card wf-card-p4'>
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
        </section>
      ) : null}

      {auditLogsQuery.isError ? (
        <Empty>
          <EmptyContent>
            <EmptyHeader>
              <EmptyTitle>Failed to load audit logs</EmptyTitle>
              <EmptyDescription>{getApiErrorMessage(auditLogsQuery.error)}</EmptyDescription>
            </EmptyHeader>
          </EmptyContent>
        </Empty>
      ) : null}

      {!auditLogsQuery.isLoading && !auditLogsQuery.isError && auditLogsItems.length === 0 ? (
        <Empty>
          <EmptyContent>
            <EmptyHeader>
              <EmptyTitle>No audit records found</EmptyTitle>
              <EmptyDescription>Adjust filters to inspect matching audit entries.</EmptyDescription>
            </EmptyHeader>
          </EmptyContent>
        </Empty>
      ) : null}

      {!auditLogsQuery.isLoading && !auditLogsQuery.isError && auditLogsItems.length > 0 ? (
        <>
          <AuditLogsTable items={auditLogsItems} onOpenDetail={openDetail} />
          <section className='wf-pagination-panel'>
            <p className='text-sm text-text-muted'>
              Page {filters.page} of {totalPages}
            </p>
            <div className='flex gap-2'>
              <Button type='button' variant='outline' onClick={handlePreviousPage} disabled={filters.page <= 1}>
                Previous
              </Button>
              <Button type='button' variant='outline' onClick={handleNextPage} disabled={filters.page >= totalPages}>
                Next
              </Button>
            </div>
          </section>
        </>
      ) : null}

      <AuditLogDetailDialog isOpen={selectedAuditLogId.length > 0} detailQuery={detailQuery} onClose={closeDetail} />
    </main>
  );
};
