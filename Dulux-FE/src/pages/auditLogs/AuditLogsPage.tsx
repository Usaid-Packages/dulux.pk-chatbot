import { useMemo, type JSX } from 'react';

import { AuditLogDetailDialog, AuditLogsFilters, AuditLogsTable } from '#/components/auditLogs';
import { ListStateBlock, PaginationFooter, StatsCardGrid } from '#/components/shared';
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

  const actionTotals = useMemo(() => {
    return auditLogsItems.reduce(
      (totals, item) => {
        if (item.action === 'CREATE') {
          totals.create += 1;
        } else if (item.action === 'UPDATE') {
          totals.update += 1;
        } else if (item.action === 'DELETE') {
          totals.delete += 1;
        }
        return totals;
      },
      { create: 0, update: 0, delete: 0 }
    );
  }, [auditLogsItems]);

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
      <StatsCardGrid
        items={[
          { label: 'Total Logs', value: totalItems },
          { label: 'Create Events', value: actionTotals.create },
          { label: 'Update Events', value: actionTotals.update },
          { label: 'Delete Events', value: actionTotals.delete },
        ]}
      />

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
