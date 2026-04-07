import type { JSX } from 'react';
import { useState } from 'react';

import { ArrowLeft } from 'lucide-react';
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
            <ArrowLeft className='h-4 w-4' />
            Back
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const claim = claimQuery.data;
  const isSendToQualityDisabled =
    claim.workflowState === 'QA_REVIEW' ||
    claim.workflowState === 'APPROVED' ||
    claim.workflowState === 'REJECTED' ||
    claim.workflowState === 'RESUBMIT' ||
    claim.workflowState === 'RESOLVED';

  return (
    <main className='space-y-4'>
      <section className='relative overflow-hidden rounded-3xl border border-primary/20 bg-[linear-gradient(120deg,#0d4ea8_0%,#2a7ddb_45%,#7fc5ff_100%)] p-5 text-white shadow-[0_18px_42px_rgba(18,79,165,0.33)] md:p-6'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_10%,rgba(255,255,255,0.3),transparent_42%)]'
        />
        <div className='relative space-y-4'>
          <Button
            type='button'
            variant='outline'
            className='h-10 rounded-xl border-[#0b1f3a] bg-[#0b1f3a] text-white shadow-[0_12px_24px_rgba(8,24,46,0.35)] hover:bg-[#08182e] hover:text-white'
            onClick={handleBackClick}
          >
            <ArrowLeft className='h-4 w-4' />
            Back
          </Button>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[2px] text-blue-100'>Claim Review</p>
            <h1 className='mt-1 text-2xl font-extrabold tracking-tight text-white'>{claim.customerName}</h1>
            <p className='text-sm text-blue-50/90'>Inspect evidence, trace workflow, and finalize claim actions.</p>
          </div>
        </div>
      </section>

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
            isSendToQualityDisabled={isSendToQualityDisabled}
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
