import type { JSX } from 'react';

import { Clock3, History, Mail, UserRound } from 'lucide-react';

import { Badge, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { useAuditTimeline } from '#/hooks/auditLogs';
import type { AuditTimelineItem, AuditTimelineTargetType } from '#/types/auditLogs';
import { cn, getApiErrorMessage } from '#/utils';

interface AuditTimelinePanelProps {
  type: AuditTimelineTargetType;
  objectId: string;
  title: string;
  subtitle: string;
  className?: string;
  maxItems?: number;
}

const ACTION_THEME_CLASS_BY_TYPE: Record<AuditTimelineItem['action'], string> = {
  CREATE: 'border-emerald-300/60 bg-emerald-100/80 text-emerald-800',
  UPDATE: 'border-sky-300/70 bg-sky-100/80 text-sky-800',
  DELETE: 'border-rose-300/70 bg-rose-100/80 text-rose-800',
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-PK', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const LONG_TEXT_LIMIT = 180;
const STATE_CHANGE_FIELDS = new Set(['state', 'workflow_state', 'workflowState', 'status']);
type StatusBadgeVariant = 'default' | 'pending' | 'approved' | 'qaApproved' | 'rejected' | 'info' | 'resolved';

const formatDateTime = (isoDateTime: string): string => {
  const parsedDate = new Date(isoDateTime);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Invalid timestamp';
  }

  return DATE_TIME_FORMATTER.format(parsedDate);
};

const formatFieldLabel = (fieldName: string): string => {
  return fieldName
    .replaceAll('_', ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase());
};

const isRecordValue = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isDateField = (fieldName: string): boolean => {
  const normalized = fieldName.trim().toLowerCase();
  return normalized.endsWith('_at') || normalized.endsWith('at');
};

const isActorField = (fieldName: string): boolean => {
  const normalized = fieldName.trim().toLowerCase();
  return normalized.endsWith('_by') || normalized.endsWith('by');
};

const formatUserReference = (value: unknown): string | null => {
  if (!isRecordValue(value)) {
    return null;
  }

  const display = typeof value.display === 'string' && value.display.trim().length > 0 ? value.display.trim() : null;
  const email = typeof value.email === 'string' && value.email.trim().length > 0 ? value.email.trim() : null;
  const role = typeof value.role === 'string' && value.role.trim().length > 0 ? value.role.trim() : null;

  if (!display && !email) {
    return null;
  }

  const identity = display ?? email ?? 'Unknown';
  if (!role) {
    return identity;
  }

  return `${identity} (${role})`;
};

const formatDateValue = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return formatDateTime(value);
};

const formatDiffValue = (fieldName: string, value: unknown): string => {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return '—';
  }

  if (typeof value === 'string') {
    if (isDateField(fieldName)) {
      const formattedDate = formatDateValue(value);
      if (formattedDate) {
        return formattedDate;
      }
    }

    return value.length > 0 ? value : '""';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (isActorField(fieldName)) {
    const formattedUserReference = formatUserReference(value);
    if (formattedUserReference) {
      return formattedUserReference;
    }
  }

  if (Array.isArray(value) || typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Unserializable value]';
    }
  }

  return String(value);
};

const getCompactValue = (fieldName: string, value: unknown): string => {
  const formattedValue = formatDiffValue(fieldName, value);
  return formattedValue.length > LONG_TEXT_LIMIT ? `${formattedValue.slice(0, LONG_TEXT_LIMIT)}...` : formattedValue;
};

const normalizeStateToken = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
};

const getStateLabel = (token: string): string => {
  if (token === 'QA_REVIEW') {
    return 'QA Review';
  }

  if (token === 'QA_APPROVED') {
    return 'QA Approved';
  }

  if (token === 'QA_REJECTED') {
    return 'QA Rejected';
  }

  if (token === 'IN_REVIEW') {
    return 'In Review';
  }

  if (token === 'RESUBMIT') {
    return 'Resubmission';
  }

  return token
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, letter => letter.toUpperCase());
};

const getStateVariant = (token: string): StatusBadgeVariant => {
  if (token === 'APPROVED') {
    return 'approved';
  }

  if (token === 'QA_APPROVED') {
    return 'qaApproved';
  }

  if (token === 'REJECTED' || token === 'QA_REJECTED') {
    return 'rejected';
  }

  if (token === 'RESOLVED') {
    return 'resolved';
  }

  if (token === 'QA_REVIEW' || token === 'RESUBMIT') {
    return 'info';
  }

  if (token === 'IN_REVIEW' || token === 'SUBMITTED') {
    return 'pending';
  }

  return 'default';
};

const renderArrowChange = (fieldName: string, beforeValue: unknown, afterValue: unknown, id: number): JSX.Element => {
  const fullBefore = formatDiffValue(fieldName, beforeValue);
  const fullAfter = formatDiffValue(fieldName, afterValue);
  const compactBefore = getCompactValue(fieldName, beforeValue);
  const compactAfter = getCompactValue(fieldName, afterValue);
  const beforeStateToken = normalizeStateToken(beforeValue);
  const afterStateToken = normalizeStateToken(afterValue);
  const isStateChange = STATE_CHANGE_FIELDS.has(fieldName) && Boolean(beforeStateToken) && Boolean(afterStateToken);

  return (
    <p
      key={`${id}-${fieldName}`}
      className='rounded-md border border-border/70 bg-surface-muted/40 px-2 py-1.5 text-xs text-text-primary'
    >
      <span className='font-semibold text-text-muted'>{formatFieldLabel(fieldName)}:</span>
      {isStateChange ? (
        <span className='ml-1 inline-flex items-center gap-1.5 align-middle'>
          <Badge variant={getStateVariant(beforeStateToken ?? '')}>{getStateLabel(beforeStateToken ?? '')}</Badge>
          <span className='text-primary'>{'\u2192'}</span>
          <Badge variant={getStateVariant(afterStateToken ?? '')}>{getStateLabel(afterStateToken ?? '')}</Badge>
        </span>
      ) : (
        <>
          {' '}
          <span title={fullBefore}>{compactBefore}</span>
          <span className='mx-1 text-primary'>{'\u2192'}</span>
          <span title={fullAfter}>{compactAfter}</span>
        </>
      )}
    </p>
  );
};

/**
 * AuditTimelinePanel renders a compact admin-only timeline with readable field-level changes.
 *
 * @param props - Timeline target and panel labels.
 * @returns Left-column timeline card or null for non-admin roles.
 */
export const AuditTimelinePanel = ({
  type,
  objectId,
  title,
  subtitle,
  className,
  maxItems = 6,
}: AuditTimelinePanelProps): JSX.Element | null => {
  const { isAdmin, timelineQuery } = useAuditTimeline(type, objectId);

  if (!isAdmin) {
    return null;
  }

  if (timelineQuery.isLoading) {
    return (
      <section className={cn('wf-card wf-card-p4 border-primary/15 bg-white/95', className)}>
        <Skeleton className='h-6 w-40' />
        <Skeleton className='mt-3 h-20 w-full' />
        <Skeleton className='mt-2 h-20 w-full' />
      </section>
    );
  }

  if (timelineQuery.isError) {
    return (
      <section className={cn('wf-card wf-card-p4 border-rose-300/60 bg-rose-50/60', className)}>
        <Empty>
          <EmptyContent>
            <EmptyHeader>
              <EmptyTitle>Unable to load timeline changes</EmptyTitle>
              <EmptyDescription>{getApiErrorMessage(timelineQuery.error)}</EmptyDescription>
            </EmptyHeader>
          </EmptyContent>
        </Empty>
      </section>
    );
  }

  const timelineItems = (timelineQuery.data?.results ?? []).slice(-maxItems).reverse();

  return (
    <section
      className={cn(
        'wf-card wf-card-p4 border-primary/15 bg-[linear-gradient(165deg,#ffffff_0%,#f2f8ff_100%)]',
        className
      )}
    >
      <header className='rounded-2xl border border-primary/20 bg-white/80 p-3'>
        <div className='flex items-start gap-2'>
          <span className='rounded-xl bg-primary/10 p-1.5 text-primary'>
            <History className='h-4 w-4' />
          </span>
          <div>
            <h2 className='text-sm font-extrabold tracking-tight text-text-primary'>{title}</h2>
            <p className='text-xs text-text-muted'>{subtitle}</p>
          </div>
        </div>
      </header>

      {timelineItems.length === 0 ? (
        <article className='mt-3 rounded-xl border border-dashed border-primary/25 bg-white/90 p-3 text-xs text-text-muted'>
          No timeline changes recorded yet.
        </article>
      ) : (
        <div className='mt-3 max-h-[34rem] space-y-3 overflow-y-auto pr-1'>
          {timelineItems.map(item => {
            const changeEntries = item.changes ? Object.entries(item.changes) : [];
            const stateChangeEntry = changeEntries.find(([fieldName]) => STATE_CHANGE_FIELDS.has(fieldName));
            const detailChangeEntries = changeEntries.filter(([fieldName]) => !STATE_CHANGE_FIELDS.has(fieldName));
            const beforeStateToken = normalizeStateToken(stateChangeEntry?.[1].before);
            const afterStateToken = normalizeStateToken(stateChangeEntry?.[1].after);
            const hasStateTransition = Boolean(beforeStateToken) && Boolean(afterStateToken);

            return (
              <article
                key={`${item.id}-${item.performedAt}`}
                className='rounded-xl border border-primary/15 bg-white/95 p-3 shadow-[0_6px_16px_rgba(19,87,167,0.08)]'
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0 space-y-1'>
                    <p className='text-sm font-semibold leading-5 text-text-primary'>{item.eventType}</p>
                    <p className='flex items-center gap-1.5 text-[11px] text-text-muted'>
                      <UserRound className='h-3 w-3' />
                      <span className='truncate'>{item.user}</span>
                    </p>
                  </div>
                  <Badge className={cn('border text-[10px]', ACTION_THEME_CLASS_BY_TYPE[item.action])}>
                    {item.action}
                  </Badge>
                </div>

                {hasStateTransition ? (
                  <div className='mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-surface-muted/40 px-2 py-1 text-xs'>
                    <span className='font-semibold text-text-muted'>State:</span>
                    <Badge variant={getStateVariant(beforeStateToken ?? '')}>
                      {getStateLabel(beforeStateToken ?? '')}
                    </Badge>
                    <span className='text-primary'>{'\u2192'}</span>
                    <Badge variant={getStateVariant(afterStateToken ?? '')}>
                      {getStateLabel(afterStateToken ?? '')}
                    </Badge>
                  </div>
                ) : null}

                <div className='mt-3 space-y-2 rounded-xl border border-primary/20 bg-white p-3'>
                  <div className='grid gap-1 text-[11px] text-text-muted md:grid-cols-2'>
                    <p className='flex items-start gap-1.5'>
                      <Mail className='h-3 w-3' />
                      <span className='min-w-0 break-all text-text-primary'>
                        <span className='font-semibold text-text-muted'>Email:</span> {item.actorEmail}
                      </span>
                    </p>
                    <p className='flex items-center gap-1.5'>
                      <Clock3 className='h-3 w-3' />
                      {formatDateTime(item.performedAt)}
                    </p>
                    {item.registrationNumber ? (
                      <p className='font-medium text-text-primary'>Reg #: {item.registrationNumber}</p>
                    ) : null}
                  </div>

                  {item.updatedFields.length > 0 ? (
                    <div className='mt-2 flex flex-wrap gap-1'>
                      {item.updatedFields.map(fieldName => (
                        <Badge
                          key={`${item.id}-${fieldName}`}
                          className='border border-primary/25 bg-primary/5 px-2 py-[2px] text-[10px] text-primary'
                        >
                          {formatFieldLabel(fieldName)}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  {detailChangeEntries.length > 0 ? (
                    <div className='mt-2 space-y-2'>
                      {detailChangeEntries.map(([fieldName, change]) =>
                        renderArrowChange(fieldName, change.before, change.after, item.id)
                      )}
                    </div>
                  ) : (
                    <p className='text-xs text-text-muted'>No field-level changes available.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
