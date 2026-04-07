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
    <article className='wf-card wf-card-p4'>
      <h2 className='text-md font-semibold text-text-primary'>Technical Assessment</h2>
      <p className='mt-1 text-sm text-text-muted'>Review evidence and submit a quality decision.</p>
      <div className='mt-4 space-y-2'>
        <Button className='w-full' disabled={isActionPending || isApproveDisabled} onClick={onOpenApproveModal}>
          {isApproveDisabled ? 'Approved' : 'Approve Claim'}
        </Button>
        <Button className='w-full' variant='outline' disabled={isActionPending} onClick={onOpenRequestInfoModal}>
          Request More Info
        </Button>
        <Button className='w-full' variant='destructive' disabled={isActionPending} onClick={onOpenRejectModal}>
          Reject Claim
        </Button>
      </div>
    </article>
  );
};
