import type { JSX } from 'react';

import type { ClaimTimelineItem } from '#/types/claims.types';
import { formatDateTime } from './helpers';

interface ClaimTimelineProps {
  timeline: ClaimTimelineItem[];
}

/**
 * ClaimTimeline presents a chronological audit trail for the claim lifecycle.
 *
 * @param props - Claim timeline events.
 * @returns Timeline section.
 */
export const ClaimTimeline = ({ timeline }: ClaimTimelineProps): JSX.Element => {
  return (
    <section className='wf-card wf-card-p4'>
      <h2 className='text-md font-semibold text-text-primary'>Claim Timeline</h2>
      <ul className='mt-4 space-y-3'>
        {timeline.map(item => (
          <li key={item.id} className='rounded-md border border-border p-3'>
            <div className='flex flex-wrap items-start justify-between gap-2'>
              <p className='text-sm font-semibold text-text-primary'>{item.event}</p>
              <p className='text-xs text-text-muted'>{formatDateTime(item.createdAt)}</p>
            </div>
            <p className='mt-1 text-sm text-text-muted'>By {item.actor}</p>
            {item.note ? <p className='mt-2 text-sm text-text-primary'>{item.note}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
};
