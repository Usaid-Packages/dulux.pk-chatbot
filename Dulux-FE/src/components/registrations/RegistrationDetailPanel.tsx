import type { JSX } from 'react';

import { Badge, Button } from '#/components/ui';
import { REGISTRATION_STATUS_LABELS } from '#/constants';
import type { RegistrationDetail, RegistrationStatus } from '#/types/registrations';
import { formatDisplayDate } from '#/utils';
import { SourceTag } from './SourceTag';

interface RegistrationDetailPanelProps {
  registration: RegistrationDetail;
  showActionCenter: boolean;
  isApprovePending: boolean;
  isApproveDisabled: boolean;
  isReviewActionDisabled: boolean;
  isResubmitPending: boolean;
  onOpenApproveModal: () => void;
  onOpenResubmitModal: () => void;
  onOpenRejectModal: () => void;
}

const getBadgeVariant = (status: RegistrationStatus): 'pending' | 'approved' | 'rejected' | 'info' => {
  if (status === 'APPROVED') {
    return 'approved';
  }

  if (status === 'REJECTED') {
    return 'rejected';
  }

  if (status === 'RESUBMIT') {
    return 'info';
  }

  return 'pending';
};

/**
 * RegistrationDetailPanel renders registration details and action controls.
 *
 * @param props - Detail payload and interaction handlers.
 * @returns Detailed registration layout.
 */
export const RegistrationDetailPanel = ({
  registration,
  showActionCenter,
  isApprovePending,
  isApproveDisabled,
  isReviewActionDisabled,
  isResubmitPending,
  onOpenApproveModal,
  onOpenResubmitModal,
  onOpenRejectModal,
}: RegistrationDetailPanelProps): JSX.Element => {
  const isRejected = registration.state === 'REJECTED';
  const isResubmissionRequested = registration.state === 'RESUBMIT';
  const isApproveActionDisabled = isApprovePending || isApproveDisabled || isRejected;
  const isReviewActionsDisabled = isReviewActionDisabled || isRejected;
  const isResubmitActionDisabled = isReviewActionsDisabled || isResubmitPending;

  return (
    <section className='space-y-4'>
      <article className='wf-card wf-card-p4 border-primary/15 bg-white'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0'>
            <p className='text-[11px] font-semibold uppercase tracking-[1.5px] text-primary'>Registration Profile</p>
            <h1 className='mt-1 truncate text-lg font-bold text-text-primary' title={registration.customerName}>
              {registration.customerName}
            </h1>
            <p className='text-sm text-text-muted'>{registration.phoneNumber}</p>
          </div>
          <Badge variant={getBadgeVariant(registration.state)}>{REGISTRATION_STATUS_LABELS[registration.state]}</Badge>
        </div>

        <dl className='mt-4 grid gap-2 text-sm'>
          <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
            <dt className='text-text-muted'>Registration ID</dt>
            <dd>
              <span className='chip-reg'>{registration.registrationCode}</span>
            </dd>
          </div>
          <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
            <dt className='text-text-muted'>Source</dt>
            <dd>
              <SourceTag source={registration.channel} />
            </dd>
          </div>
          <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
            <dt className='text-text-muted'>Email</dt>
            <dd className='max-w-[190px] truncate text-right font-medium text-text-primary' title={registration.email}>
              {registration.email}
            </dd>
          </div>
          <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
            <dt className='text-text-muted'>City</dt>
            <dd className='font-medium text-text-primary'>{registration.city}</dd>
          </div>
          <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
            <dt className='text-text-muted'>Site Address</dt>
            <dd
              className='max-w-[220px] truncate text-right font-medium text-text-primary'
              title={registration.siteAddress}
            >
              {registration.siteAddress}
            </dd>
          </div>
          <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
            <dt className='text-text-muted'>Purchase Date</dt>
            <dd className='font-medium text-text-primary'>{formatDisplayDate(registration.purchaseDate)}</dd>
          </div>
          <div className='flex justify-between gap-3'>
            <dt className='text-text-muted'>Submitted On</dt>
            <dd className='font-medium text-text-primary'>{formatDisplayDate(registration.created)}</dd>
          </div>
        </dl>

        <p className='mt-4 rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-text-primary'>
          {registration.notes || 'No additional notes provided.'}
        </p>
      </article>

      {showActionCenter ? (
        <article className='wf-card wf-card-p4 border-primary/15 bg-white/95'>
          <h2 className='text-md font-semibold text-text-primary'>Action Center</h2>
          <p className='mt-1 text-sm text-text-muted'>Move registration to next workflow step.</p>
          <div className='mt-4 space-y-2'>
            <Button
              type='button'
              className='h-10 w-full rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white shadow-[0_12px_24px_rgba(24,102,198,0.25)] hover:brightness-105'
              disabled={isApproveActionDisabled}
              onClick={onOpenApproveModal}
            >
              {isApprovePending ? 'Approving...' : isRejected ? 'Rejected' : isApproveDisabled ? 'Approved' : 'Approve'}
            </Button>
            <Button
              type='button'
              variant='outline'
              className='h-10 w-full rounded-xl border-primary/25 bg-white text-primary hover:bg-primary/10'
              disabled={isResubmitActionDisabled}
              onClick={onOpenResubmitModal}
            >
              {isResubmitPending
                ? 'Submitting...'
                : isResubmissionRequested
                  ? 'Submit Resubmission Changes'
                  : 'Request Resubmission'}
            </Button>
            <Button
              type='button'
              variant='destructive'
              className='h-10 w-full rounded-xl'
              disabled={isReviewActionsDisabled}
              onClick={onOpenRejectModal}
            >
              Reject Registration
            </Button>
          </div>
        </article>
      ) : null}
    </section>
  );
};
