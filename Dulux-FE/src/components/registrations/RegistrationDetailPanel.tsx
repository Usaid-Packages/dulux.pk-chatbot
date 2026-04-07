import type { JSX } from 'react';

import { Badge, Button } from '#/components/ui';
import { REGISTRATION_STATUS_LABELS } from '#/constants';
import type { RegistrationDetail, RegistrationStatus } from '#/types/registrations';
import { SourceTag } from './SourceTag';

interface RegistrationDetailPanelProps {
  registration: RegistrationDetail;
  isApprovePending: boolean;
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
  onApprove,
  onOpenResubmitModal,
  onOpenRejectModal,
}: RegistrationDetailPanelProps): JSX.Element => {
  return (
    <section className='space-y-4'>
      <article className='wf-card wf-card-p4'>
        <div className='flex items-start justify-between gap-2'>
          <div>
            <h1 className='text-lg font-bold text-text-primary'>{registration.customerName}</h1>
            <p className='text-sm text-text-muted'>{registration.phoneNumber}</p>
          </div>
          <Badge variant={getBadgeVariant(registration.state)}>{REGISTRATION_STATUS_LABELS[registration.state]}</Badge>
        </div>

        <dl className='mt-4 grid gap-2 text-sm'>
          <div className='flex justify-between gap-2'>
            <dt className='text-text-muted'>Registration ID</dt>
            <dd>
              <span className='chip-reg'>{registration.registrationCode}</span>
            </dd>
          </div>
          <div className='flex justify-between gap-2'>
            <dt className='text-text-muted'>Source</dt>
            <dd>
              <SourceTag source={registration.channel} />
            </dd>
          </div>
          <div className='flex justify-between gap-2'>
            <dt className='text-text-muted'>Email</dt>
            <dd className='font-medium text-text-primary'>{registration.email}</dd>
          </div>
          <div className='flex justify-between gap-2'>
            <dt className='text-text-muted'>City</dt>
            <dd className='font-medium text-text-primary'>{registration.city}</dd>
          </div>
          <div className='flex justify-between gap-2'>
            <dt className='text-text-muted'>Purchase Date</dt>
            <dd className='font-medium text-text-primary'>
              {new Date(registration.purchaseDate).toLocaleDateString()}
            </dd>
          </div>
          <div className='flex justify-between gap-2'>
            <dt className='text-text-muted'>Submitted</dt>
            <dd className='font-medium text-text-primary'>{new Date(registration.created).toLocaleDateString()}</dd>
          </div>
        </dl>

        <p className='mt-4 rounded-md bg-surface-muted p-3 text-sm text-text-primary'>
          {registration.notes || 'No additional notes provided.'}
        </p>
      </article>

      <article className='wf-card wf-card-p4'>
        <h2 className='text-md font-semibold text-text-primary'>Action Center</h2>
        <p className='mt-1 text-sm text-text-muted'>Move registration to next workflow step.</p>
        <div className='mt-4 space-y-2'>
          <Button type='button' className='w-full' disabled={isApprovePending} onClick={onApprove}>
            {isApprovePending ? 'Approving...' : 'Approve'}
          </Button>
          <Button type='button' variant='outline' className='w-full' onClick={onOpenResubmitModal}>
            Request Resubmission
          </Button>
          <Button type='button' variant='destructive' className='w-full' onClick={onOpenRejectModal}>
            Reject Registration
          </Button>
        </div>
      </article>

      <article className='wf-card wf-card-p4'>
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
