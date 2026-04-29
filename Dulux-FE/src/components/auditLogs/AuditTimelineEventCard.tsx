import type { JSX } from 'react';

import { Clock3, Mail, UserRound } from 'lucide-react';

import { Badge } from '#/components/ui';
import type { AuditTimelineItemViewModel } from '#/types/auditLogs';
import { cn, getStateLabel, getStateVariant } from '#/utils';
import { AuditTimelineChangeRenderer } from './AuditTimelineChangeRenderer';

interface AuditTimelineEventCardProps {
  item: AuditTimelineItemViewModel;
}

const ACTION_THEME_CLASS_BY_TYPE: Record<AuditTimelineItemViewModel['action'], string> = {
  CREATE: 'border-emerald-300/60 bg-emerald-100/80 text-emerald-800',
  UPDATE: 'border-sky-300/70 bg-sky-100/80 text-sky-800',
  DELETE: 'border-rose-300/70 bg-rose-100/80 text-rose-800',
};

/**
 * AuditTimelineEventCard renders one event in the audit timeline list using precomputed view-model data.
 *
 * @param props - Timeline event presentation model.
 * @returns Event card UI.
 */
export const AuditTimelineEventCard = ({ item }: AuditTimelineEventCardProps): JSX.Element => {
  return (
    <article
      key={item.key}
      className='rounded-xl border border-primary/15 bg-white/95 p-3 shadow-[0_6px_16px_rgba(19,87,167,0.08)]'
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0 space-y-1'>
          <p className='text-sm font-semibold leading-5 text-text-primary'>{item.eventType}</p>
          <p className='flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted'>
            <UserRound className='h-3 w-3 shrink-0' />
            <span className='truncate'>{item.user}</span>
            <span className='inline-flex min-w-0 items-center gap-1 text-text-muted/90'>
              <Mail className='h-3 w-3 shrink-0' />
              <span className='truncate'>{item.actorEmail}</span>
            </span>
          </p>
          <p className='flex items-center gap-1.5 text-[11px] text-text-muted'>
            <Clock3 className='h-3 w-3 shrink-0' />
            <span>
              <span className='font-semibold text-text-muted'>Performed at:</span> {item.performedAtLabel}
            </span>
          </p>
        </div>
        <Badge className={cn('border text-[10px]', ACTION_THEME_CLASS_BY_TYPE[item.action])}>{item.action}</Badge>
      </div>

      {item.stateTransition ? (
        <div className='mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-surface-muted/40 px-2 py-1 text-xs'>
          <span className='font-semibold text-text-muted'>State:</span>
          <Badge variant={getStateVariant(item.stateTransition.beforeToken)}>
            {getStateLabel(item.stateTransition.beforeToken)}
          </Badge>
          <span className='text-primary'>{'\u2192'}</span>
          <Badge variant={getStateVariant(item.stateTransition.afterToken)}>
            {getStateLabel(item.stateTransition.afterToken)}
          </Badge>
        </div>
      ) : null}

      <div className='mt-3 space-y-2 rounded-xl bg-white'>
        <div className='grid gap-1 text-[11px] text-text-muted md:grid-cols-2'>
          {item.registrationNumber ? (
            <p className='font-medium text-text-primary'>Reg #: {item.registrationNumber}</p>
          ) : null}
        </div>

        {item.updatedFields.length > 0 ? (
          <div className='mt-2 flex flex-wrap gap-1'>
            {item.updatedFields.map(field => (
              <Badge
                key={`${item.key}-${field.key}`}
                className='border border-primary/25 bg-primary/5 px-2 py-[2px] text-[10px] text-primary'
              >
                {field.label}
              </Badge>
            ))}
          </div>
        ) : null}

        {item.detailChanges.length > 0 ? (
          <div className='mt-2 space-y-2'>
            {item.detailChanges.map(change => (
              <AuditTimelineChangeRenderer key={change.key} change={change} />
            ))}
          </div>
        ) : item.stateTransition ? null : (
          <p className='text-xs text-text-muted'>No field-level changes available.</p>
        )}
      </div>
    </article>
  );
};
