import type { JSX } from 'react';

import type { ClaimPriority } from '#/types/claims.types';
import { formatDateTime, getPriorityClass, getPriorityLabel } from './helpers';

interface QualityQuickInfoCardProps {
  forwardedBy: string;
  forwardedAt: string;
  priority: ClaimPriority;
}

/**
 * QualityQuickInfoCard shows queue-specific metadata for QA reviewers.
 *
 * @param props - Forwarding and priority details.
 * @returns Quick info card.
 */
export const QualityQuickInfoCard = ({
  forwardedBy,
  forwardedAt,
  priority,
}: QualityQuickInfoCardProps): JSX.Element => {
  return (
    <article className='wf-card wf-card-p4 border-primary/15 bg-white/95'>
      <h2 className='text-md font-semibold text-text-primary'>Queue Context</h2>
      <dl className='mt-3 space-y-2 text-sm'>
        <div className='flex items-start justify-between gap-3 border-b border-border/50 pb-1'>
          <dt className='text-text-muted'>Forwarded By</dt>
          <dd className='text-right font-medium text-text-primary'>{forwardedBy}</dd>
        </div>
        <div className='flex items-start justify-between gap-3 border-b border-border/50 pb-1'>
          <dt className='text-text-muted'>Forwarded On</dt>
          <dd className='text-right font-medium text-text-primary'>{formatDateTime(forwardedAt)}</dd>
        </div>
        <div className='flex items-start justify-between gap-3'>
          <dt className='text-text-muted'>Priority</dt>
          <dd>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getPriorityClass(priority)}`}
            >
              {getPriorityLabel(priority)}
            </span>
          </dd>
        </div>
      </dl>
    </article>
  );
};
