import type { JSX } from 'react';

import { AuditLogDetailDialog, AuditLogsFilters, AuditLogsTable } from '#/components/auditLogs';
import { ListStateBlock, PaginationFooter } from '#/components/shared';
import { LIST_PAGE_SIZE } from '#/constants';
import { useAuditLogs } from '#/hooks/auditLogs';
import { getApiErrorMessage } from '#/utils';

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
  const totalPages = Math.max(1, Math.ceil(totalItems / LIST_PAGE_SIZE));

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

      <ListStateBlock
        isLoading={auditLogsQuery.isLoading}
        isError={auditLogsQuery.isError}
        isEmpty={auditLogsItems.length === 0}
        errorTitle='Failed to load audit logs'
        errorDescription={getApiErrorMessage(auditLogsQuery.error)}
        emptyTitle='No audit records found'
        emptyDescription='Adjust filters to inspect matching audit entries.'
      >
        <>
          <AuditLogsTable items={auditLogsItems} onOpenDetail={openDetail} />
          <PaginationFooter
            currentPage={filters.page}
            totalPages={totalPages}
            disablePrevious={filters.page <= 1}
            disableNext={filters.page >= totalPages}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
          />
        </>
      </ListStateBlock>

      <AuditLogDetailDialog isOpen={selectedAuditLogId.length > 0} detailQuery={detailQuery} onClose={closeDetail} />
    </main>
  );
};
