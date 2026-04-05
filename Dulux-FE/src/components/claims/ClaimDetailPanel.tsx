import type { JSX } from 'react';

import { Badge, Button } from '#/components/ui';
import type { ClaimDetail } from '#/types/claims.types';
import { formatDate, getStatusLabel, getStatusVariant } from './helpers';

interface ClaimDetailPanelProps {
  claim: ClaimDetail;
  onOpenForwardModal: () => void;
  onOpenRequestInfoModal: () => void;
  onOpenRejectModal: () => void;
  isActionPending: boolean;
}

/**
 * ClaimDetailPanel renders primary claim metadata and action controls.
 *
 * @param props - Claim detail model and action handlers.
 * @returns Claim detail side panel.
 */
export const ClaimDetailPanel = ({
  claim,
  onOpenForwardModal,
  onOpenRequestInfoModal,
  onOpenRejectModal,
  isActionPending,
}: ClaimDetailPanelProps): JSX.Element => {
  return (
    <section className='space-y-4'>
      <article className='wf-card wf-card-p4'>
        <div className='flex items-start justify-between gap-2'>
          <div>
            <h1 className='text-lg font-bold text-text-primary'>{claim.customerName}</h1>
            <p className='text-sm text-text-muted'>{claim.phone}</p>
          </div>
          <Badge variant={getStatusVariant(claim.status)}>{getStatusLabel(claim.status)}</Badge>
        </div>

        <dl className='mt-4 grid gap-2 text-sm'>
          <div className='flex justify-between gap-2'>
            <dt className='text-text-muted'>Claim ID</dt>
            <dd>
              <span className='chip-claim'>{claim.claimNumber}</span>
            </dd>
          </div>
          <div className='flex justify-between gap-2'>
            <dt className='text-text-muted'>Issue Type</dt>
            <dd className='font-medium text-text-primary'>{claim.issueType}</dd>
          </div>
          <div className='flex justify-between gap-2'>
            <dt className='text-text-muted'>Area</dt>
            <dd className='font-medium text-text-primary'>{claim.areaSqFt} sq ft</dd>
          </div>
          <div className='flex justify-between gap-2'>
            <dt className='text-text-muted'>Topcoat</dt>
            <dd className='font-medium text-text-primary'>{claim.topcoat}</dd>
          </div>
          <div className='flex justify-between gap-2'>
            <dt className='text-text-muted'>Batch Number</dt>
            <dd className='font-medium text-text-primary'>{claim.batchNumber}</dd>
          </div>
          <div className='flex justify-between gap-2'>
            <dt className='text-text-muted'>Submitted</dt>
            <dd className='font-medium text-text-primary'>{formatDate(claim.submittedAt)}</dd>
          </div>
        </dl>

        <p className='mt-4 rounded-md bg-surface-muted p-3 text-sm text-text-primary'>{claim.description}</p>
      </article>

      <article className='wf-card wf-card-p4'>
        <h2 className='text-md font-semibold text-text-primary'>Action Center</h2>
        <p className='mt-1 text-sm text-text-muted'>Move claim to next workflow step.</p>
        <div className='mt-4 space-y-2'>
          <Button className='w-full' onClick={onOpenForwardModal} disabled={isActionPending}>
            Send To Quality
          </Button>
          <Button className='w-full' variant='outline' onClick={onOpenRequestInfoModal} disabled={isActionPending}>
            Request More Info
          </Button>
          <Button className='w-full' variant='destructive' onClick={onOpenRejectModal} disabled={isActionPending}>
            Reject Claim
          </Button>
        </div>
      </article>
    </section>
  );
};
