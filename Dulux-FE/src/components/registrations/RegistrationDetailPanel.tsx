import type { JSX } from 'react';

import { Badge, Button, Empty, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { REGISTRATION_STATUS_LABELS } from '#/constants';
import type { RegistrationDetail, RegistrationStatus } from '#/types/registrations';
import { SourceTag } from './SourceTag';

interface RegistrationDetailPanelProps {
  registration?: RegistrationDetail;
  isLoading: boolean;
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
  isLoading,
  isApprovePending,
  onApprove,
  onOpenResubmitModal,
  onOpenRejectModal,
}: RegistrationDetailPanelProps): JSX.Element => {
  if (isLoading) {
    return (
      <section className='space-y-4'>
        <Skeleton className='h-40 w-full rounded-lg' />
        <Skeleton className='h-40 w-full rounded-lg' />
        <Skeleton className='h-40 w-full rounded-lg' />
      </section>
    );
  }

  if (!registration) {
    return (
      <section className='rounded-lg border border-border bg-surface p-6'>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Registration not found</EmptyTitle>
            <EmptyDescription>Please return to the list and choose another record.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    );
  }

  return (
    <section className='grid gap-4 xl:grid-cols-[1fr,340px]'>
      <div className='space-y-4'>
        <article className='rounded-lg border border-border bg-surface p-5'>
          <h2 className='text-base font-semibold text-text-primary'>Customer Information</h2>
          <dl className='mt-3 grid gap-3 text-sm md:grid-cols-2'>
            <div>
              <dt className='text-text-muted'>Name</dt>
              <dd className='font-medium text-text-primary'>{registration.customerName}</dd>
            </div>
            <div>
              <dt className='text-text-muted'>Phone</dt>
              <dd className='font-medium text-text-primary'>{registration.phoneNumber}</dd>
            </div>
            <div>
              <dt className='text-text-muted'>Email</dt>
              <dd className='font-medium text-text-primary'>{registration.email}</dd>
            </div>
            <div>
              <dt className='text-text-muted'>City</dt>
              <dd className='font-medium text-text-primary'>{registration.city}</dd>
            </div>
          </dl>
        </article>

        <article className='rounded-lg border border-border bg-surface p-5'>
          <h2 className='text-base font-semibold text-text-primary'>Purchase Information</h2>
          <dl className='mt-3 grid gap-3 text-sm md:grid-cols-2'>
            <div>
              <dt className='text-text-muted'>Purchase date</dt>
              <dd className='font-medium text-text-primary'>
                {new Date(registration.purchaseDate).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className='text-text-muted'>Dealer</dt>
              <dd className='font-medium text-text-primary'>{registration.purchaseDealer}</dd>
            </div>
            <div>
              <dt className='text-text-muted'>Dealer city</dt>
              <dd className='font-medium text-text-primary'>{registration.purchaseDealerCity}</dd>
            </div>
            <div>
              <dt className='text-text-muted'>Dealer address</dt>
              <dd className='font-medium text-text-primary'>{registration.purchaseDealerAddress}</dd>
            </div>
          </dl>
        </article>

        <article className='rounded-lg border border-border bg-surface p-5'>
          <h2 className='text-base font-semibold text-text-primary'>Products</h2>
          <div className='mt-3 overflow-x-auto'>
            <table className='min-w-full text-sm'>
              <thead>
                <tr className='border-b border-border text-left text-text-muted'>
                  <th className='py-2'>Topcoat</th>
                  <th className='py-2'>Topcoat Qty</th>
                  <th className='py-2'>Basecoat</th>
                  <th className='py-2'>Basecoat Qty</th>
                </tr>
              </thead>
              <tbody>
                {registration.paintPairs.map(pair => (
                  <tr key={pair.id} className='border-b border-border/60 last:border-b-0'>
                    <td className='py-2'>{pair.topcoat.name}</td>
                    <td className='py-2'>{pair.topcoatQuantity}</td>
                    <td className='py-2'>{pair.basecoat?.name ?? 'N/A'}</td>
                    <td className='py-2'>{pair.basecoatQuantity ?? 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className='rounded-lg border border-border bg-surface p-5'>
          <h2 className='text-base font-semibold text-text-primary'>Invoice Gallery</h2>
          <div className='mt-3 grid gap-3 sm:grid-cols-2'>
            {registration.paintPairInvoices.map(invoice => (
              <a
                key={invoice.id}
                href={invoice.image.image}
                target='_blank'
                rel='noreferrer'
                className='block rounded-md border border-border p-2 transition hover:bg-surface-muted'
              >
                <p className='text-xs font-semibold text-text-muted'>{invoice.invoiceType.replace('_', ' ')}</p>
                <p className='mt-1 truncate text-sm text-primary'>Open invoice</p>
              </a>
            ))}
          </div>
        </article>
      </div>

      <aside className='space-y-4'>
        <article className='rounded-lg border border-border bg-surface p-5'>
          <h2 className='text-base font-semibold text-text-primary'>Actions</h2>
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

        <article className='rounded-lg border border-border bg-surface p-5'>
          <h2 className='text-base font-semibold text-text-primary'>Quick Info</h2>
          <div className='mt-3 space-y-3 text-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-text-muted'>Status</span>
              <Badge variant={getBadgeVariant(registration.state)}>
                {REGISTRATION_STATUS_LABELS[registration.state]}
              </Badge>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-text-muted'>Source</span>
              <SourceTag source={registration.channel} />
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-text-muted'>Submitted</span>
              <span className='font-medium text-text-primary'>
                {new Date(registration.created).toLocaleDateString()}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-text-muted'>Assigned to</span>
              <span className='font-medium text-text-primary'>{registration.approvedByEmail ?? 'Unassigned'}</span>
            </div>
          </div>
        </article>
      </aside>
    </section>
  );
};
