import type { JSX } from 'react';

import { Button } from '#/components/ui';

interface QualityDecisionPanelProps {
  isActionPending: boolean;
  isApproveDisabled: boolean;
  onOpenApproveModal: () => void;
  onOpenRequestInfoModal: () => void;
  onOpenRejectModal: () => void;
}

/**
 * QualityDecisionPanel renders QA decision actions for the selected claim.
 *
 * @param props - Decision handlers and pending state.
 * @returns Technical assessment action card.
 */
export const QualityDecisionPanel = ({
  isActionPending,
  isApproveDisabled,
  onOpenApproveModal,
  onOpenRequestInfoModal,
  onOpenRejectModal,
}: QualityDecisionPanelProps): JSX.Element => {
  return (
    <article className='wf-card wf-card-p4 border-primary/15 bg-white/95'>
      <h2 className='text-md font-semibold text-text-primary'>Technical Assessment</h2>
      <p className='mt-1 text-sm text-text-muted'>Review evidence and submit a quality decision.</p>
      <div className='mt-4 space-y-2'>
        <Button
          className='h-10 w-full rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white shadow-[0_12px_24px_rgba(24,102,198,0.25)] hover:brightness-105'
          disabled={isActionPending || isApproveDisabled}
          onClick={onOpenApproveModal}
        >
          {isApproveDisabled ? 'Approved' : 'Approve Claim'}
        </Button>
        <Button
          className='h-10 w-full rounded-xl border-primary/25 bg-white text-primary hover:bg-primary/10'
          variant='outline'
          disabled={isActionPending}
          onClick={onOpenRequestInfoModal}
        >
          Request More Info
        </Button>
        <Button
          className='h-10 w-full rounded-xl'
          variant='destructive'
          disabled={isActionPending}
          onClick={onOpenRejectModal}
        >
          Reject Claim
        </Button>
      </div>
    </article>
  );
};
