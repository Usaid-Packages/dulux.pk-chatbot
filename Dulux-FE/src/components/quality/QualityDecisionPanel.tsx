/* eslint import/order: off */
import type { JSX } from 'react';

import { Button } from '#/components/ui';

interface QualityDecisionPanelProps {
  isActionPending: boolean;
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
  onOpenApproveModal,
  onOpenRequestInfoModal,
  onOpenRejectModal,
}: QualityDecisionPanelProps): JSX.Element => {
  return (
    <article className='rounded-lg border border-border bg-surface p-4'>
      <h2 className='text-md font-semibold text-text-primary'>Technical Assessment</h2>
      <p className='mt-1 text-sm text-text-muted'>Review evidence and submit a quality decision.</p>
      <div className='mt-4 space-y-2'>
        <Button className='w-full' disabled={isActionPending} onClick={onOpenApproveModal}>
          Approve Claim
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
