import type { JSX } from 'react';
import { useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import {
  ClaimDetailPanel,
  ClaimImages,
  ClaimTimeline,
  ClaimWorkflowCard,
  ForwardToQualityModal,
  LinkedRegistrationCard,
  RejectClaimModal,
  RequestMoreInfoModal,
} from '#/components/claims';
import { Button, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { ROUTES } from '#/constants';
import { useClaimDetail } from '#/hooks/claims';
import type {
  ForwardToQualityFormValues,
  RejectClaimFormValues,
  RequestMoreInfoFormValues,
} from '#/schemas/claim.schema';

/**
 * ClaimDetailPage renders full claim detail, evidence, workflow, and action modals.
 *
 * @returns Claim detail route page.
 */
export const ClaimDetailPage = (): JSX.Element => {
  const params = useParams<{ id: string }>();
  const claimId = params.id ?? '';

  const navigate = useNavigate();

  const { claimQuery, handleReject, handleRequestMoreInfo, handleSendToQuality, isActionPending } =
    useClaimDetail(claimId);

  const [isForwardModalOpen, setForwardModalOpen] = useState(false);
  const [isRejectModalOpen, setRejectModalOpen] = useState(false);
  const [isRequestInfoModalOpen, setRequestInfoModalOpen] = useState(false);

  const handleBackClick = (): void => {
    navigate(ROUTES.CLAIMS);
  };

  const openForwardModal = (): void => setForwardModalOpen(true);
  const openRejectModal = (): void => setRejectModalOpen(true);
  const openRequestInfoModal = (): void => setRequestInfoModalOpen(true);

  const closeForwardModal = (): void => setForwardModalOpen(false);
  const closeRejectModal = (): void => setRejectModalOpen(false);
  const closeRequestInfoModal = (): void => setRequestInfoModalOpen(false);

  const submitForward = (values: ForwardToQualityFormValues): void => {
    handleSendToQuality({ id: claimId, ...values });
    closeForwardModal();
  };

  const submitReject = (values: RejectClaimFormValues): void => {
    handleReject({ id: claimId, ...values });
    closeRejectModal();
  };

  const submitRequestInfo = (values: RequestMoreInfoFormValues): void => {
    const selectedItems = values.items.filter(item => item !== 'Other');
    const requestItems = values.otherDetails ? [...selectedItems, values.otherDetails] : selectedItems;

    handleRequestMoreInfo({
      id: claimId,
      items: requestItems,
      note: values.note,
      priority: values.priority,
    });
    closeRequestInfoModal();
  };

  if (claimQuery.isLoading) {
    return (
      <section className='space-y-3'>
        <Skeleton className='h-10 w-32' />
        <Skeleton className='h-60 w-full' />
        <Skeleton className='h-60 w-full' />
      </section>
    );
  }

  if (claimQuery.isError || !claimQuery.data) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyHeader>
            <EmptyTitle>Unable to load claim detail</EmptyTitle>
            <EmptyDescription>{claimQuery.error?.message ?? 'Claim not found.'}</EmptyDescription>
          </EmptyHeader>
          <Button type='button' variant='outline' onClick={handleBackClick}>
            Back To Claims
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const claim = claimQuery.data;

  return (
    <main className='space-y-4'>
      <Button type='button' variant='outline' onClick={handleBackClick}>
        Back To Claims
      </Button>

      <section className='grid gap-4 lg:grid-cols-[1fr_340px]'>
        <div className='space-y-4'>
          <ClaimImages photos={claim.evidencePhotos} />
          <LinkedRegistrationCard registration={claim.linkedRegistration} />
          <ClaimTimeline timeline={claim.timeline} />
        </div>

        <div className='space-y-4'>
          <ClaimDetailPanel
            claim={claim}
            onOpenForwardModal={openForwardModal}
            onOpenRequestInfoModal={openRequestInfoModal}
            onOpenRejectModal={openRejectModal}
            isActionPending={isActionPending}
          />
          <ClaimWorkflowCard status={claim.status} workflowState={claim.workflowState} />
        </div>
      </section>

      <ForwardToQualityModal
        isOpen={isForwardModalOpen}
        isSubmitting={isActionPending}
        onClose={closeForwardModal}
        onSubmit={submitForward}
      />

      <RejectClaimModal
        isOpen={isRejectModalOpen}
        isSubmitting={isActionPending}
        onClose={closeRejectModal}
        onSubmit={submitReject}
      />

      <RequestMoreInfoModal
        isOpen={isRequestInfoModalOpen}
        isSubmitting={isActionPending}
        onClose={closeRequestInfoModal}
        onSubmit={submitRequestInfo}
      />
    </main>
  );
};
