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
      <header className='relative overflow-hidden rounded-3xl border border-primary/20 bg-[linear-gradient(120deg,#0d4ea8_0%,#2a7ddb_45%,#7fc5ff_100%)] p-5 text-white md:p-6'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,rgba(255,255,255,0.32),transparent_42%)]'
        />
        <div className='relative'>
          <p className='text-xs font-semibold uppercase tracking-[2px] text-blue-100'>Administrative Oversight</p>
          <h2 className='mt-1 text-2xl font-extrabold tracking-tight text-white'>Audit Logs</h2>
          <p className='text-sm text-blue-50/90'>
            Review who changed records, when actions happened, and object diffs.
          </p>
        </div>
      </header>

      <section className='wf-stat-grid-4'>
        <article className='wf-stat-card border-primary/15 bg-white'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-text-muted'>Total Logs</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-text-primary'>{totalItems}</p>
        </article>
        <article className='wf-stat-card border-green-300/60 bg-[linear-gradient(140deg,#ecfff4_0%,#ddf8e9_100%)]'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-green-700'>Create Events</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-green-900'>{totalCreate}</p>
        </article>
        <article className='wf-stat-card border-sky-300/60 bg-[linear-gradient(140deg,#eff8ff_0%,#dff0ff_100%)]'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-sky-700'>Update Events</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-sky-900'>{totalUpdate}</p>
        </article>
        <article className='wf-stat-card border-rose-300/60 bg-[linear-gradient(140deg,#fff2f2_0%,#ffe2e2_100%)]'>
          <p className='text-xs font-semibold uppercase tracking-[1.2px] text-rose-700'>Delete Events</p>
          <p className='mt-2 text-3xl font-extrabold tracking-tight text-rose-900'>{totalDelete}</p>
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
