import type { JSX } from 'react';

import { Badge, Button } from '#/components/ui';
import { getClaimIssueTypeLabel } from '#/constants';
import type { ClaimDetail } from '#/types/claims.types';
import { formatDate, getStatusLabel, getStatusVariant } from './helpers';

interface ClaimDetailPanelProps {
  claim: ClaimDetail;
  onOpenApproveModal: () => void;
  onOpenForwardModal: () => void;
  onOpenRejectModal: () => void;
  isActionPending: boolean;
  canSendToQuality: boolean;
  canFinalApprove: boolean;
  canFinalReject: boolean;
}

/**
 * ClaimDetailPanel renders primary claim metadata and action controls.
 *
 * @param props - Claim detail model and action handlers.
 * @returns Claim detail side panel.
 */
export const ClaimDetailPanel = ({
  claim,
  onOpenApproveModal,
  onOpenForwardModal,
  onOpenRejectModal,
  isActionPending,
  canSendToQuality,
  canFinalApprove,
  canFinalReject,
}: ClaimDetailPanelProps): JSX.Element => {
  return (
    <section className='space-y-4'>
      <article className='wf-card wf-card-p4 border-primary/15 bg-white'>
        <div className='flex items-start justify-between gap-2'>
          <div>
            <p className='text-[11px] font-semibold uppercase tracking-[1.5px] text-primary'>Claim Profile</p>
            <h1 className='mt-1 text-lg font-bold text-text-primary'>{claim.customerName}</h1>
            <p className='text-sm text-text-muted'>{claim.phone}</p>
          </div>
          <Badge variant={getStatusVariant(claim.status, claim.workflowState)}>
            {getStatusLabel(claim.status, claim.workflowState)}
          </Badge>
        </div>

        <dl className='mt-4 grid gap-2 text-sm'>
          <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
            <dt className='text-text-muted'>Claim ID</dt>
            <dd>
              <span className='chip-claim'>{claim.claimNumber}</span>
            </dd>
          </div>
          <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
            <dt className='text-text-muted'>Issue Type</dt>
            <dd className='font-medium text-text-primary'>{getClaimIssueTypeLabel(claim.issueType)}</dd>
          </div>
          <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
            <dt className='text-text-muted'>Area</dt>
            <dd className='font-medium text-text-primary'>{claim.areaSqFt} sq ft</dd>
          </div>
          <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
            <dt className='text-text-muted'>Topcoat</dt>
            <dd className='font-medium text-text-primary'>{claim.topcoat}</dd>
          </div>
          <div className='flex justify-between gap-3'>
            <dt className='text-text-muted'>Submitted</dt>
            <dd className='font-medium text-text-primary'>{formatDate(claim.submittedAt)}</dd>
          </div>
        </dl>

        <p className='mt-4 rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-text-primary'>
          {claim.description}
        </p>
      </article>

      <article className='wf-card wf-card-p4 border-primary/15 bg-white/95'>
        <h2 className='text-md font-semibold text-text-primary'>Action Center</h2>
        <p className='mt-1 text-sm text-text-muted'>Available actions depend on current workflow state.</p>
        <div className='mt-4 space-y-2'>
          {canFinalApprove ? (
            <Button
              className='h-10 w-full rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white shadow-[0_12px_24px_rgba(24,102,198,0.25)] hover:brightness-105'
              onClick={onOpenApproveModal}
              disabled={isActionPending}
            >
              Final Approve
            </Button>
          ) : null}
          {canSendToQuality ? (
            <Button
              className='h-10 w-full rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white shadow-[0_12px_24px_rgba(24,102,198,0.25)] hover:brightness-105'
              onClick={onOpenForwardModal}
              disabled={isActionPending}
            >
              Send To Quality
            </Button>
          ) : null}
          {canFinalReject ? (
            <Button
              className='h-10 w-full rounded-xl'
              variant='destructive'
              onClick={onOpenRejectModal}
              disabled={isActionPending}
            >
              Final Reject
            </Button>
          ) : null}
          {!canSendToQuality && !canFinalApprove && !canFinalReject ? (
            <p className='rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-text-muted'>
              No CS/Admin actions are available for the current claim state.
            </p>
          ) : null}
        </div>
      </article>
    </section>
  );
};
