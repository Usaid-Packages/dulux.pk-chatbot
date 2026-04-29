import { useMemo, type JSX } from 'react';

import { History } from 'lucide-react';

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { useAuditTimeline } from '#/hooks/auditLogs';
import type { AuditTimelineTargetType } from '#/types/auditLogs';
import { buildAuditTimelineItemViewModels, cn, getApiErrorMessage } from '#/utils';
import { AuditTimelineEventCard } from './AuditTimelineEventCard';

interface AuditTimelinePanelProps {
  type: AuditTimelineTargetType;
  objectId: string;
  title: string;
  subtitle: string;
  className?: string;
}

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
}: AuditTimelinePanelProps): JSX.Element | null => {
  const { isAdmin, timelineQuery } = useAuditTimeline(type, objectId);

  const timelineItemViewModels = useMemo(() => {
    const timelineItems = [...(timelineQuery.data?.results ?? [])].reverse();
    return buildAuditTimelineItemViewModels(timelineItems);
  }, [timelineQuery.data?.results]);

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

      {timelineItemViewModels.length === 0 ? (
        <article className='mt-3 rounded-xl border border-dashed border-primary/25 bg-white/90 p-3 text-xs text-text-muted'>
          No timeline changes recorded yet.
        </article>
      ) : (
        <div className='mt-3 max-h-[34rem] space-y-3 overflow-y-auto pr-1'>
          {timelineItemViewModels.map(item => (
            <AuditTimelineEventCard key={item.key} item={item} />
          ))}
        </div>
      )}
    </section>
  );
};
