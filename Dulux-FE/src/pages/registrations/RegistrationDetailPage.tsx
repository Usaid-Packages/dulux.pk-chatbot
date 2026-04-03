import type { JSX } from 'react';
import { useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { RegistrationDetailPanel, RejectRegistrationModal, ResubmissionModal } from '#/components/registrations';
import { Button } from '#/components/ui';
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
          Back to Registrations
        </Button>
        <article className='rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive'>
          Invalid registration id.
        </article>
      </section>
    );
  }

  return (
    <section className='space-y-4'>
      <Button type='button' variant='outline' onClick={handleBackToList}>
        Back to Registrations
      </Button>

      {isError ? (
        <article className='rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive'>
          {errorMessage}
        </article>
      ) : (
        <RegistrationDetailPanel
          registration={registration}
          isLoading={isLoading}
          isApprovePending={isApprovePending}
          onApprove={approveRegistration}
          onOpenResubmitModal={openResubmissionModal}
          onOpenRejectModal={openRejectModal}
        />
      )}

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
    </section>
  );
};
