import type { JSX } from 'react';

import { Info } from 'lucide-react';

import type { RequestedCorrectionNote } from '#/types/registrations';

interface ResubmitUpdateCorrectionNotesSectionProps {
  notes: RequestedCorrectionNote[];
}

/**
 * Renders deduplicated requested correction notes authored during rejection.
 *
 * @param props - Requested correction notes for current resubmission.
 * @returns Notes section or null when there are no notes.
 */
export const ResubmitUpdateCorrectionNotesSection = ({
  notes,
}: ResubmitUpdateCorrectionNotesSectionProps): JSX.Element | null => {
  if (notes.length === 0) {
    return null;
  }

  return (
    <section className='space-y-2 rounded-lg border border-warning/30 bg-warning/10 p-3'>
      <div className='flex items-center gap-2'>
        <Info className='h-4 w-4 shrink-0 text-warning' />
        <h3 className='text-sm font-semibold text-warning'>Requested Correction Notes</h3>
      </div>
      {notes.map(noteItem => (
        <div key={noteItem.key} className='rounded-md border border-warning/30 bg-white/60 p-2'>
          <p className='text-xs leading-5 text-text-primary'>{noteItem.note}</p>
          {noteItem.timestamp ? <p className='mt-1 text-[11px] text-text-muted'>Added: {noteItem.timestamp}</p> : null}
        </div>
      ))}
    </section>
  );
};
