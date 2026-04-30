import type { JSX } from 'react';

import { Badge, Button } from '#/components/ui';
import { getClaimIssueTypeLabel } from '#/constants';
import type { ClaimDetail } from '#/types/claims.types';
import { formatDisplayDate } from '#/utils/date';
import { getStatusLabel, getStatusVariant } from './helpers';

interface ClaimDetailPanelProps {
  claim: ClaimDetail;
  onOpenApproveModal: () => void;
  onOpenCsrResubmissionModal: () => void;
  onOpenForwardModal: () => void;
  onOpenRejectModal: () => void;
  isActionPending: boolean;
  canCsrResubmit: boolean;
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
  onOpenCsrResubmissionModal,
  onOpenForwardModal,
  onOpenRejectModal,
  isActionPending,
  canCsrResubmit,
  canSendToQuality,
  canFinalApprove,
  canFinalReject,
}: ClaimDetailPanelProps): JSX.Element => {
  const noteItems = [
    claim.csNotes ? { key: 'cs', label: 'Note', value: claim.csNotes } : null,
    claim.qualityNotes ? { key: 'quality', label: 'Note', value: claim.qualityNotes } : null,
  ].filter((item): item is { key: 'cs' | 'quality'; label: string; value: string } => item !== null);

  return (
    <section className='space-y-4'>
      <article className='wf-card wf-card-p4 border-primary/15 bg-white'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0'>
            <p className='text-[11px] font-semibold uppercase tracking-[1.5px] text-primary'>Claim Profile</p>
            <h1 className='mt-1 truncate text-lg font-bold text-text-primary' title={claim.customerName}>
              {claim.customerName}
            </h1>
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
            <dt className='text-text-muted'>Topcoat/Specialist</dt>
            <dd className='font-medium text-text-primary'>{claim.topcoat}</dd>
          </div>
          <div className='flex justify-between gap-3'>
            <dt className='text-text-muted'>Submitted</dt>
            <dd className='font-medium text-text-primary'>{formatDisplayDate(claim.submittedAt)}</dd>
          </div>
        </dl>

        <div className='mt-4 rounded-xl border border-primary/15 bg-primary/5 p-3'>
          <p className='text-[11px] font-semibold uppercase tracking-[1.2px] text-text-muted'>Notes</p>
          {noteItems.length > 0 ? (
            <div className='mt-2 space-y-2'>
              {noteItems.map(noteItem => (
                <p key={noteItem.key} className='text-sm text-text-primary'>
                  <span className='font-semibold text-text-muted'>{noteItem.label}:</span> {noteItem.value}
                </p>
              ))}
            </div>
          ) : (
            <p className='mt-2 text-sm text-text-primary'>{claim.description}</p>
          )}
        </div>
      </article>

      <article className='wf-card wf-card-p4 border-primary/15 bg-white/95'>
        <h2 className='text-md font-semibold text-text-primary'>Action Center</h2>
        <p className='mt-1 text-sm text-text-muted'>Available actions depend on current workflow state.</p>
        <div className='mt-4 space-y-2'>
          {canFinalApprove ? (
            <Button
              variant='primaryGradientElevated'
              className='h-10 w-full rounded-xl'
              onClick={onOpenApproveModal}
              disabled={isActionPending}
            >
              Final Approve
            </Button>
          ) : null}
          {canSendToQuality ? (
            <Button
              variant='primaryGradientElevated'
              className='h-10 w-full rounded-xl'
              onClick={onOpenForwardModal}
              disabled={isActionPending}
            >
              Send To Quality
            </Button>
          ) : null}
          {canCsrResubmit ? (
            <Button
              variant='primaryGradientElevated'
              className='h-10 w-full rounded-xl'
              onClick={onOpenCsrResubmissionModal}
              disabled={isActionPending}
            >
              CSR Resubmission
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
          {!canSendToQuality && !canFinalApprove && !canFinalReject && !canCsrResubmit ? (
            <p className='rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-text-muted'>
              No actions are available for the current claim state.
            </p>
          ) : null}
        </div>
      </article>
    </section>
  );
};
