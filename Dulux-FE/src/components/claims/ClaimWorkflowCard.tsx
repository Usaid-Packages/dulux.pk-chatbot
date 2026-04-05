import type { JSX } from 'react';

import type { ClaimStatus } from '#/types/claims.types';

interface ClaimWorkflowCardProps {
  status: ClaimStatus;
}

const WORKFLOW_STEPS = ['CS Review', 'Quality Review', 'Resolution'] as const;

const getCurrentStep = (status: ClaimStatus): number => {
  if (status === 'pending' || status === 'infoRequested') {
    return 1;
  }

  if (status === 'forwarded') {
    return 2;
  }

  return 3;
};

/**
 * ClaimWorkflowCard visualizes the 3-step claim processing workflow.
 *
 * @param props - Current claim status.
 * @returns Workflow progress card.
 */
export const ClaimWorkflowCard = ({ status }: ClaimWorkflowCardProps): JSX.Element => {
  const currentStep = getCurrentStep(status);

  return (
    <section className='wf-card wf-card-p4'>
      <h2 className='text-md font-semibold text-text-primary'>Claim Workflow</h2>
      <ol className='mt-3 space-y-2'>
        {WORKFLOW_STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isComplete = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <li key={step} className='flex items-center gap-3'>
              <span
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                  isComplete ? 'bg-primary text-white' : '',
                  isCurrent ? 'border border-primary bg-primary/10 text-primary' : '',
                  !isComplete && !isCurrent ? 'bg-surface-muted text-text-muted' : '',
                ].join(' ')}
              >
                {stepNumber}
              </span>
              <span className={isCurrent ? 'font-semibold text-text-primary' : 'text-sm text-text-muted'}>{step}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
