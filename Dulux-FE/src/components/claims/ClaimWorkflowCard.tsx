import type { JSX } from 'react';

import { getClaimWorkflowStateLabel, toApiClaimWorkflowState } from '#/constants';
import type { ClaimStatus } from '#/types/claims.types';

interface ClaimWorkflowCardProps {
  status: ClaimStatus;
  workflowState?: string;
}

const WORKFLOW_STEPS = ['CS Review', 'Quality Review', 'Resolution'] as const;

const getStepStyles = (status: ClaimStatus) => {
  const resolutionPalette =
    status === 'rejected'
      ? {
          complete: 'bg-status-rejected-text text-white',
          current: 'border border-status-rejected-text bg-status-rejected-bg text-status-rejected-text',
          upcoming: 'bg-status-rejected-bg text-status-rejected-text opacity-70',
        }
      : status === 'resolved'
        ? {
            complete: 'bg-status-resolved-text text-white',
            current: 'border border-status-resolved-text bg-status-resolved-bg text-status-resolved-text',
            upcoming: 'bg-status-resolved-bg text-status-resolved-text opacity-70',
          }
        : {
            complete: 'bg-status-approved-text text-white',
            current: 'border border-status-approved-text bg-status-approved-bg text-status-approved-text',
            upcoming: 'bg-status-approved-bg text-status-approved-text opacity-70',
          };

  return {
    1: {
      complete: 'bg-primary text-white',
      current: 'border border-primary bg-primary/10 text-primary',
      upcoming: 'bg-primary/10 text-primary opacity-70',
    },
    2: {
      complete: 'bg-status-forwarded-text text-white',
      current: 'border border-status-forwarded-text bg-status-forwarded-bg text-status-forwarded-text',
      upcoming: 'bg-status-forwarded-bg text-status-forwarded-text opacity-70',
    },
    3: resolutionPalette,
  } as const;
};

const getCurrentStep = (status: ClaimStatus): number => {
  if (status === 'pending' || status === 'infoRequested') {
    return 1;
  }

  if (status === 'forwarded') {
    return 2;
  }

  return 3;
};

const getStateChipClasses = (normalizedState: string): string => {
  switch (normalizedState) {
    case 'QA_REJECT':
    case 'QA_REJECTED':
    case 'REJECTED':
      return 'bg-status-rejected-bg text-status-rejected-text';
    case 'QA_APPROVED':
      return 'bg-status-qaApproved-bg text-status-qaApproved-text';
    case 'APPROVED':
      return 'bg-status-approved-bg text-status-approved-text';
    case 'QA_REVIEW':
      return 'bg-status-forwarded-bg text-status-forwarded-text';
    case 'RESUBMIT':
      return 'bg-status-infoReq-bg text-status-infoReq-text';
    case 'RESOLVED':
      return 'bg-status-resolved-bg text-status-resolved-text';
    case 'IN_REVIEW':
    case 'SUBMITTED':
    default:
      return 'bg-status-pending-bg text-status-pending-text';
  }
};

/**
 * ClaimWorkflowCard visualizes the 3-step claim processing workflow.
 *
 * @param props - Current claim status.
 * @returns Workflow progress card.
 */
export const ClaimWorkflowCard = ({ status, workflowState }: ClaimWorkflowCardProps): JSX.Element => {
  const currentStep = getCurrentStep(status);
  const stepStyles = getStepStyles(status);
  const stateValue = workflowState ?? status;
  const normalizedState = toApiClaimWorkflowState(stateValue);
  const stateLabel = getClaimWorkflowStateLabel(normalizedState);

  return (
    <section className='wf-card wf-card-p4 border-primary/15 bg-white/95'>
      <div className='flex items-center justify-between gap-3'>
        <h2 className='text-md font-semibold text-text-primary'>Claim Workflow</h2>
        <span
          className={[
            'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
            getStateChipClasses(normalizedState),
          ].join(' ')}
        >
          {stateLabel}
        </span>
      </div>
      <p className='mt-1 text-xs text-text-muted'>Track where this claim currently sits in the review pipeline.</p>
      <ol className='mt-4 space-y-3'>
        {WORKFLOW_STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isComplete = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const stepStyle = stepStyles[stepNumber as 1 | 2 | 3];
          const stepCircleClass = isComplete ? stepStyle.complete : isCurrent ? stepStyle.current : stepStyle.upcoming;
          const stepLabelClass = isCurrent ? 'text-sm font-semibold text-text-primary' : 'text-sm text-text-muted';

          return (
            <li
              key={step}
              className='flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 px-2.5 py-2'
            >
              <span
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                  stepCircleClass,
                ].join(' ')}
              >
                {stepNumber}
              </span>
              <span className={stepLabelClass}>{step}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
