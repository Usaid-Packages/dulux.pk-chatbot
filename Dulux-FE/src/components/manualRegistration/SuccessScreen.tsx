import type { JSX } from 'react';

import { Check } from 'lucide-react';

import { Button } from '#/components/ui';

interface SuccessScreenProps {
  registrationCode: string;
  onViewRegistration: () => void;
  onCreateAnother: () => void;
  onBackToList: () => void;
}

/**
 * SuccessScreen renders post-submit confirmation and next actions.
 *
 * @param props - Success metadata and navigation handlers.
 * @returns Manual registration success UI.
 */
export const SuccessScreen = ({
  registrationCode,
  onViewRegistration,
  onCreateAnother,
  onBackToList,
}: SuccessScreenProps): JSX.Element => {
  return (
    <section className='mx-auto max-w-3xl space-y-5 rounded-xl border border-border bg-surface p-8 text-center'>
      <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-iconBg text-success-iconText'>
        <Check className='h-7 w-7' aria-hidden='true' />
      </div>

      <div className='space-y-2'>
        <h3 className='text-2xl font-semibold text-text-primary'>Registration Submitted Successfully</h3>
        <p className='text-sm text-text-muted'>
          The manual warranty registration has been created and routed to the approval queue.
        </p>
      </div>

      <p className='inline-flex rounded-md bg-success-regIdBg px-3 py-1 font-mono text-sm font-semibold text-success-regIdText'>
        {registrationCode}
      </p>
      <p className='text-sm text-text-secondary'>Registration Code has been generated</p>

      <div className='rounded-lg border border-info-border bg-info-bg p-4 text-left'>
        <p className='text-sm text-info-text'>
          This registration will now follow the standard approval workflow.
          <br />
          You can track its status from the Registrations list.
        </p>
      </div>

      <div className='flex flex-wrap justify-center gap-3'>
        <Button type='button' onClick={onViewRegistration}>
          View Registration
        </Button>
        <Button type='button' variant='outline' onClick={onCreateAnother}>
          Create Another
        </Button>
        <Button type='button' variant='ghost' onClick={onBackToList}>
          Back to List
        </Button>
      </div>
    </section>
  );
};
