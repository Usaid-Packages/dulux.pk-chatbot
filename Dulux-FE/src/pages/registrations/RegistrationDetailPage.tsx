import type { JSX } from 'react';
import { useState } from 'react';

import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { RegistrationDetailPanel, RejectRegistrationModal, ResubmissionModal } from '#/components/registrations';
import {
  Button,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  ImagePreviewGallery,
  Skeleton,
} from '#/components/ui';
import { ROUTES } from '#/constants';
import { useRegistrationDetail } from '#/hooks/registrations';

/**
 * RegistrationDetailPage renders detailed registration data with CS actions.
 *
 * @returns Registration detail route content.
 */
export const RegistrationDetailPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { id } = useParams();

  const registrationId = id ?? '';
  const [isResubmissionModalOpen, setIsResubmissionModalOpen] = useState<boolean>(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);

  const {
    isLoading,
    isError,
    errorMessage,
    isApprovePending,
    isRejectPending,
    isResubmitPending,
    registration,
    approveRegistration,
    rejectRegistration,
    resubmitRegistration,
  } = useRegistrationDetail(registrationId);

  const handleBackToList = (): void => {
    navigate(ROUTES.REGISTRATIONS);
  };

  const openResubmissionModal = (): void => {
    setIsResubmissionModalOpen(true);
  };

  const closeResubmissionModal = (): void => {
    setIsResubmissionModalOpen(false);
  };

  const openRejectModal = (): void => {
    setIsRejectModalOpen(true);
  };

  const closeRejectModal = (): void => {
    setIsRejectModalOpen(false);
  };

  const handleRejectSubmit = (values: Parameters<typeof rejectRegistration>[0]): void => {
    rejectRegistration(values, closeRejectModal);
  };

  const handleResubmissionSubmit = (values: Parameters<typeof resubmitRegistration>[0]): void => {
    resubmitRegistration(values, closeResubmissionModal);
  };

  if (!registrationId) {
    return (
      <section className='space-y-3'>
        <Button type='button' variant='outline' onClick={handleBackToList}>
          <ArrowLeft className='h-4 w-4' />
          Back
        </Button>
        <article className='rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive'>
          Invalid registration id.
        </article>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className='space-y-3'>
        <Skeleton className='h-10 w-40' />
        <Skeleton className='h-56 w-full' />
        <Skeleton className='h-56 w-full' />
      </section>
    );
  }

  if (isError || !registration) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyHeader>
            <EmptyTitle>Unable to load registration detail</EmptyTitle>
            <EmptyDescription>{errorMessage || 'Registration not found.'}</EmptyDescription>
          </EmptyHeader>
          <Button type='button' variant='outline' onClick={handleBackToList}>
            <ArrowLeft className='h-4 w-4' />
            Back
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const invoiceGalleryItems = registration.paintPairInvoices.map(invoice => ({
    id: invoice.id,
    label: `${invoice.invoiceType.replace(/_/g, ' ')} Invoice`,
    url: invoice.image.image,
  }));

  return (
    <main className='space-y-4'>
      <Button type='button' variant='outline' onClick={handleBackToList}>
        <ArrowLeft className='h-4 w-4' />
        Back
      </Button>

      <section className='grid gap-4 lg:grid-cols-[1fr_340px]'>
        <div className='space-y-4'>
          <ImagePreviewGallery
            title='Invoice Gallery'
            description='Click any invoice to open full preview.'
            items={invoiceGalleryItems}
            emptyMessage='No invoices uploaded for this registration.'
            fallbackModalTitle='Invoice'
          />

          <article className='wf-card wf-card-p4'>
            <h2 className='text-md font-semibold text-text-primary'>Products</h2>
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

          <article className='wf-card wf-card-p4'>
            <h2 className='text-md font-semibold text-text-primary'>Purchase Information</h2>
            <dl className='mt-3 grid gap-3 text-sm md:grid-cols-2'>
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
              <div>
                <dt className='text-text-muted'>Postal code</dt>
                <dd className='font-medium text-text-primary'>{registration.postalCode}</dd>
              </div>
            </dl>
          </article>
        </div>

        <div className='space-y-4'>
          <RegistrationDetailPanel
            registration={registration}
            isApprovePending={isApprovePending}
            isApproveDisabled={registration.state === 'APPROVED'}
            onApprove={approveRegistration}
            onOpenResubmitModal={openResubmissionModal}
            onOpenRejectModal={openRejectModal}
          />
        </div>
      </section>

      <ResubmissionModal
        isOpen={isResubmissionModalOpen}
        isSubmitting={isResubmitPending}
        onClose={closeResubmissionModal}
        onSubmit={handleResubmissionSubmit}
      />

      <RejectRegistrationModal
        isOpen={isRejectModalOpen}
        isSubmitting={isRejectPending}
        onClose={closeRejectModal}
        onSubmit={handleRejectSubmit}
      />
    </main>
  );
};
