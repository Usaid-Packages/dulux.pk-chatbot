import { useState } from 'react';
import type { JSX } from 'react';

import type { UseQueryResult } from '@tanstack/react-query';
import { CalendarClock, Database, Diff, Fingerprint, GitCompareArrows, UserRound } from 'lucide-react';

import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Skeleton,
} from '#/components/ui';
import type { AuditLogDetail } from '#/types/auditLogs';
import { getApiErrorMessage } from '#/utils';
import { formatAuditCreatedAt, getAuditActionBadgeVariant, getAuditActionLabel } from './helpers';

interface AuditLogDetailDialogProps {
  isOpen: boolean;
  detailQuery: UseQueryResult<AuditLogDetail, Error>;
  onClose: () => void;
}

const LONG_TEXT_TRUNCATE_LIMIT = 280;

const toTitleCaseWords = (value: string): string => {
  return value
    .split(' ')
    .filter(token => token.length > 0)
    .map(token => `${token.charAt(0).toUpperCase()}${token.slice(1).toLowerCase()}`)
    .join(' ');
};

const formatFieldLabel = (fieldName: string): string => {
  const spacedField = fieldName
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .trim();
  return toTitleCaseWords(spacedField);
};

const formatStateLikeValue = (value: string): string => {
  return toTitleCaseWords(value.replaceAll('_', ' ').trim());
};

const isStateLikeField = (fieldName: string): boolean => {
  const normalizedField = fieldName.toLowerCase();
  return normalizedField === 'state' || normalizedField.includes('workflow');
};

const formatComparableValue = (fieldName: string, value: unknown): string => {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  if (typeof value === 'string') {
    if (value.trim().length === 0) {
      return 'N/A';
    }

    if (isStateLikeField(fieldName)) {
      return formatStateLikeValue(value);
    }

    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return String(value);
  } catch {
    return 'N/A';
  }
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const getArrayItemBaseKey = (fieldName: string, item: unknown): string => {
  if (item === null) {
    return `${fieldName}-null`;
  }

  if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
    return `${fieldName}-${String(item)}`;
  }

  if (Array.isArray(item)) {
    return `${fieldName}-array-${item.length}`;
  }

  if (isObjectRecord(item)) {
    const objectId = item.id;
    if (typeof objectId === 'string' || typeof objectId === 'number') {
      return `${fieldName}-object-id-${String(objectId)}`;
    }

    return `${fieldName}-object-${Object.keys(item).sort().join('-')}`;
  }

  return `${fieldName}-${String(item)}`;
};

const ExpandableValue = ({ value }: { value: string }): JSX.Element => {
  const [isExpanded, setExpanded] = useState(false);
  const shouldTruncate = value.length > LONG_TEXT_TRUNCATE_LIMIT;
  const displayText = shouldTruncate && !isExpanded ? `${value.slice(0, LONG_TEXT_TRUNCATE_LIMIT)}...` : value;

  const handleToggle = (): void => {
    setExpanded(previous => !previous);
  };

  return (
    <div className='w-full min-w-0 space-y-1'>
      <p className='whitespace-pre-wrap break-words [overflow-wrap:anywhere]'>{displayText}</p>
      {shouldTruncate ? (
        <button
          type='button'
          className='text-[11px] font-semibold text-primary underline decoration-primary/50 underline-offset-2 hover:text-primary/80'
          onClick={handleToggle}
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </div>
  );
};

const SnapshotValue = ({ fieldName, value }: { fieldName: string; value: unknown }): JSX.Element => {
  if (value === null || value === undefined) {
    return <span>N/A</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span>N/A</span>;
    }

    return (
      <ul className='space-y-1'>
        {(() => {
          const occurrenceByBaseKey = new Map<string, number>();

          return value.map(item => {
            const baseKey = getArrayItemBaseKey(fieldName, item);
            const occurrence = (occurrenceByBaseKey.get(baseKey) ?? 0) + 1;
            occurrenceByBaseKey.set(baseKey, occurrence);

            return (
              <li key={`${baseKey}-${occurrence}`} className='rounded-md border border-primary/10 bg-white px-2 py-1'>
                <ExpandableValue value={formatComparableValue(fieldName, item)} />
              </li>
            );
          });
        })()}
      </ul>
    );
  }

  if (isObjectRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <span>N/A</span>;
    }

    return (
      <div className='space-y-1.5'>
        {entries.map(([childFieldName, childValue]) => (
          <div
            key={`${fieldName}-${childFieldName}`}
            className='rounded-md border border-primary/10 bg-white px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]'
          >
            <p className='text-[11px] font-semibold uppercase tracking-wide text-text-muted'>
              {formatFieldLabel(childFieldName)}
            </p>
            <div className='mt-0.5 max-h-32 overflow-auto text-xs text-text-primary'>
              <ExpandableValue value={formatComparableValue(childFieldName, childValue)} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <ExpandableValue value={formatComparableValue(fieldName, value)} />;
};

const ComparableValueBlock = ({ fieldName, value }: { fieldName: string; value: unknown }): JSX.Element => {
  return (
    <div className='w-full min-w-0 min-h-[2.5rem] max-h-44 overflow-y-auto overflow-x-hidden rounded-xl border border-primary/15 bg-white p-2 text-xs text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]'>
      <SnapshotValue fieldName={fieldName} value={value} />
    </div>
  );
};

const SnapshotFieldsSection = ({
  title,
  value,
}: {
  title: string;
  value: Record<string, unknown> | null;
}): JSX.Element => {
  const entries = value ? Object.entries(value) : [];

  return (
    <section className='rounded-2xl border border-primary/20 bg-gradient-to-b from-white to-primary/[0.03] p-3'>
      <h4 className='text-sm font-semibold text-text-primary'>{title}</h4>
      {entries.length === 0 ? (
        <p className='mt-2 text-xs text-text-muted'>No fields available.</p>
      ) : (
        <div className='mt-3 grid auto-rows-max items-start gap-2'>
          {entries.map(([fieldName, fieldValue]) => (
            <article
              key={`${title}-${fieldName}`}
              className='w-full min-w-0 rounded-xl border border-primary/12 bg-white/70 p-2 backdrop-blur-[1px]'
            >
              <p className='text-[11px] font-semibold uppercase tracking-wide text-text-muted'>
                {formatFieldLabel(fieldName)}
              </p>
              <div className='mt-1 w-full min-w-0 min-h-[2rem] max-h-36 overflow-y-auto overflow-x-hidden text-xs text-text-primary'>
                <SnapshotValue fieldName={fieldName} value={fieldValue} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

const SummaryMetaItem = ({ icon, label, value }: { icon: JSX.Element; label: string; value: string }): JSX.Element => {
  return (
    <div className='rounded-xl border border-primary/15 bg-white/70 p-2'>
      <div className='flex items-center gap-1.5'>
        <span className='text-primary/70'>{icon}</span>
        <p className='text-[10px] font-semibold uppercase tracking-wide text-text-muted'>{label}</p>
      </div>
      <p className='mt-1 whitespace-pre-wrap break-words text-xs font-medium text-text-primary [overflow-wrap:anywhere]'>
        {value}
      </p>
    </div>
  );
};

/**
 * AuditLogDetailDialog renders on-demand detail with changes and before/after snapshots.
 *
 * @param props - Detail query state and visibility controls.
 * @returns Audit detail dialog.
 */
export const AuditLogDetailDialog = ({ isOpen, detailQuery, onClose }: AuditLogDetailDialogProps): JSX.Element => {
  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      onClose();
    }
  };

  const detail = detailQuery.data;
  const changedFieldEntries = detail?.changes ? Object.entries(detail.changes) : [];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className='max-h-[90vh] max-w-[1120px] overflow-hidden border border-primary/20 bg-white p-0'>
        <DialogHeader className='border-b border-primary/15 bg-[linear-gradient(120deg,#0d4ea8_0%,#2a7ddb_45%,#7fc5ff_100%)] px-5 pb-4 pt-5'>
          <DialogTitle className='text-xl font-extrabold tracking-tight text-white'>Audit Detail Explorer</DialogTitle>
          <DialogDescription className='text-blue-50/95'>
            Visual diff for model changes with contextual snapshots and actor traceability.
          </DialogDescription>
        </DialogHeader>

        {detailQuery.isLoading ? (
          <section className='space-y-3 p-5'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-40 w-full' />
            <Skeleton className='h-40 w-full' />
          </section>
        ) : null}

        {detailQuery.isError ? (
          <section className='p-5'>
            <Empty>
              <EmptyContent>
                <EmptyHeader>
                  <EmptyTitle>Unable to load audit log detail</EmptyTitle>
                  <EmptyDescription>{getApiErrorMessage(detailQuery.error)}</EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          </section>
        ) : null}

        {!detailQuery.isLoading && !detailQuery.isError && detail ? (
          <section className='grid h-[calc(90vh-120px)] min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[290px_1fr]'>
            <aside className='min-h-0 overflow-y-auto border-b border-primary/10 bg-gradient-to-b from-slate-50 to-white p-4 lg:border-b-0 lg:border-r'>
              <div className='space-y-3'>
                <div className='rounded-xl border border-primary/20 bg-white p-3'>
                  <p className='text-[10px] font-semibold uppercase tracking-[1.3px] text-text-muted'>Event Type</p>
                  <div className='mt-2 flex items-center gap-2'>
                    <Badge variant={getAuditActionBadgeVariant(detail.action)}>
                      {getAuditActionLabel(detail.action)}
                    </Badge>
                    <span className='rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary'>
                      ID #{detail.id}
                    </span>
                  </div>
                </div>

                <SummaryMetaItem
                  icon={<CalendarClock className='h-3.5 w-3.5' />}
                  label='Created At'
                  value={formatAuditCreatedAt(detail.created)}
                />
                <SummaryMetaItem
                  icon={<UserRound className='h-3.5 w-3.5' />}
                  label='Actor Email'
                  value={detail.actorEmail}
                />
                <SummaryMetaItem
                  icon={<Database className='h-3.5 w-3.5' />}
                  label='Model Label'
                  value={detail.modelLabel}
                />
                <SummaryMetaItem
                  icon={<Fingerprint className='h-3.5 w-3.5' />}
                  label='Object Identity'
                  value={`${detail.objectId} · ${detail.objectRepr}`}
                />
                <SummaryMetaItem
                  icon={<Diff className='h-3.5 w-3.5' />}
                  label='Changed Fields'
                  value={String(changedFieldEntries.length)}
                />
              </div>
            </aside>

            <div className='min-h-0 overflow-y-auto p-4 md:p-5'>
              <div className='space-y-5'>
                {detail.action === 'UPDATE' && changedFieldEntries.length > 0 ? (
                  <section className='space-y-3'>
                    <div className='flex items-center gap-2'>
                      <div className='inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                        <GitCompareArrows className='h-4 w-4' />
                      </div>
                      <div>
                        <h4 className='text-base font-bold tracking-tight text-text-primary'>
                          Changed Fields Comparison
                        </h4>
                        <p className='text-xs text-text-muted'>Before and after values for each modified field.</p>
                      </div>
                    </div>

                    <div className='space-y-3'>
                      {changedFieldEntries.map(([field, value]) => (
                        <article
                          key={field}
                          className='overflow-hidden rounded-2xl border border-primary/15 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-3'
                        >
                          <p className='text-sm font-semibold text-text-primary'>{formatFieldLabel(field)}</p>
                          <div className='mt-2 grid items-start gap-3 md:grid-cols-2'>
                            <div className='self-start'>
                              <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-rose-700'>Before</p>
                              <ComparableValueBlock fieldName={field} value={value.before} />
                            </div>
                            <div className='self-start'>
                              <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
                                After
                              </p>
                              <ComparableValueBlock fieldName={field} value={value.after} />
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}

                {detail.action === 'CREATE' ? (
                  <SnapshotFieldsSection title='After Snapshot' value={detail.afterData} />
                ) : null}
                {detail.action === 'DELETE' ? (
                  <SnapshotFieldsSection title='Before Snapshot' value={detail.beforeData} />
                ) : null}
                {detail.action === 'UPDATE' ? (
                  <section className='grid items-start gap-4 md:grid-cols-2'>
                    <SnapshotFieldsSection title='Before Snapshot' value={detail.beforeData} />
                    <SnapshotFieldsSection title='After Snapshot' value={detail.afterData} />
                  </section>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
