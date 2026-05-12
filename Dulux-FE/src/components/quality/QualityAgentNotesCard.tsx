import type { JSX } from 'react';

interface QualityAgentNotesCardProps {
  notes?: string;
}

/**
 * QualityAgentNotesCard presents claim notes before evidence review.
 *
 * @param props - Note text.
 * @returns Notes card.
 */
export const QualityAgentNotesCard = ({ notes }: QualityAgentNotesCardProps): JSX.Element => {
  return (
    <section className='max-h-[150px] overflow-auto rounded-2xl border border-primary/15 bg-white p-4'>
      <h2 className='text-md font-semibold text-text-primary'>Note</h2>
      <div className='mt-2 overflow-auto rounded-xl border border-primary/15 bg-primary/5 p-3'>
        <p className='text-sm text-text-primary'>{notes ?? 'No note was provided when this claim was forwarded.'}</p>
      </div>
    </section>
  );
};
