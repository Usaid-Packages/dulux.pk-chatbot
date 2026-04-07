import type { JSX } from 'react';

import { Badge, Button } from '#/components/ui';
import { REGISTRATION_STATUS_LABELS } from '#/constants';
import type { RegistrationDetail, RegistrationStatus } from '#/types/registrations';
import { SourceTag } from './SourceTag';

interface RegistrationDetailPanelProps {
  registration: RegistrationDetail;
  isApprovePending: boolean;
  isApproveDisabled: boolean;
  onApprove: () => void;
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
  isApprovePending,
  isApproveDisabled,
  onApprove,
  onOpenResubmitModal,
  onOpenRejectModal,
}: RegistrationDetailPanelProps): JSX.Element => {
  return (
    <section className='space-y-4'>
      <article className='wf-card wf-card-p4 border-primary/15 bg-[linear-gradient(170deg,#ffffff_0%,#f1f7ff_100%)]'>
        <div className='flex items-start justify-between gap-2'>
          <div>
            <p className='text-[11px] font-semibold uppercase tracking-[1.5px] text-primary'>Registration Profile</p>
            <h1 className='mt-1 text-lg font-bold text-text-primary'>{registration.customerName}</h1>
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
            <dd className='font-medium text-text-primary'>{registration.email}</dd>
          </div>
          <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
            <dt className='text-text-muted'>City</dt>
            <dd className='font-medium text-text-primary'>{registration.city}</dd>
          </div>
          <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
            <dt className='text-text-muted'>Purchase Date</dt>
            <dd className='font-medium text-text-primary'>
              {new Date(registration.purchaseDate).toLocaleDateString()}
            </dd>
          </div>
          <div className='flex justify-between gap-3'>
            <dt className='text-text-muted'>Submitted</dt>
            <dd className='font-medium text-text-primary'>{new Date(registration.created).toLocaleDateString()}</dd>
          </div>
        </dl>

        <p className='mt-4 rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-text-primary'>
          {registration.notes || 'No additional notes provided.'}
        </p>
      </article>

      <article className='wf-card wf-card-p4 border-primary/15 bg-white/95'>
        <h2 className='text-md font-semibold text-text-primary'>Action Center</h2>
        <p className='mt-1 text-sm text-text-muted'>Move registration to next workflow step.</p>
        <div className='mt-4 space-y-2'>
          <Button
            type='button'
            className='h-10 w-full rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white shadow-[0_12px_24px_rgba(24,102,198,0.25)] hover:brightness-105'
            disabled={isApprovePending || isApproveDisabled}
            onClick={onApprove}
          >
            {isApprovePending ? 'Approving...' : isApproveDisabled ? 'Approved' : 'Approve'}
          </Button>
          <Button
            type='button'
            variant='outline'
            className='h-10 w-full rounded-xl border-primary/25 bg-white text-primary hover:bg-primary/10'
            onClick={onOpenResubmitModal}
          >
            Request Resubmission
          </Button>
          <Button type='button' variant='destructive' className='h-10 w-full rounded-xl' onClick={onOpenRejectModal}>
            Reject Registration
          </Button>
        </div>
      </article>

      <article className='wf-card wf-card-p4 border-primary/15 bg-white/95'>
        <h2 className='text-md font-semibold text-text-primary'>Quick Info</h2>
        <div className='mt-3 space-y-3 text-sm'>
          <div className='flex items-center justify-between'>
            <span className='text-text-muted'>Dealer</span>
            <span className='font-medium text-text-primary'>{registration.purchaseDealer}</span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-text-muted'>Dealer City</span>
            <span className='font-medium text-text-primary'>{registration.purchaseDealerCity}</span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-text-muted'>Assigned to</span>
            <span className='font-medium text-text-primary'>{registration.approvedByEmail ?? 'Unassigned'}</span>
          </div>
          <div className='flex items-start justify-between gap-3'>
            <span className='text-text-muted'>Site Address</span>
            <span className='text-right font-medium text-text-primary'>{registration.siteAddress}</span>
          </div>
        </div>
      </article>
    </section>
  );
};
