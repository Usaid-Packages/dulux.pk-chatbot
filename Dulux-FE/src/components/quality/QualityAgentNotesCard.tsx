import type { JSX } from 'react';

interface QualityAgentNotesCardProps {
  notes?: string;
}

/**
 * QualityAgentNotesCard presents CS notes before evidence review.
 *
 * @param props - CS notes text.
 * @returns Notes card.
 */
export const QualityAgentNotesCard = ({ notes }: QualityAgentNotesCardProps): JSX.Element => {
  return (
    <section className='rounded-2xl border border-primary/15 bg-[linear-gradient(170deg,#ffffff_0%,#f1f7ff_100%)] p-4'>
      <h2 className='text-md font-semibold text-text-primary'>CS Agent Notes</h2>
      <p className='mt-2 rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-text-primary'>
        {notes ?? 'No CS notes were provided when this claim was forwarded.'}
      </p>
    </section>
  );
};
