import type { JSX } from 'react';
import { useState } from 'react';

import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import {
  ApproveClaimModal,
  ClaimDetailPanel,
  ClaimImages,
  ClaimTimeline,
  ClaimWorkflowCard,
  ForwardToQualityModal,
  LinkedRegistrationCard,
  RejectClaimModal,
} from '#/components/claims';
import { Button, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { ROUTES } from '#/constants';
import { useClaimDetail } from '#/hooks/claims';
import type {
  ApproveClaimFinalFormValues,
  ForwardToQualityFormValues,
  RejectClaimFinalFormValues,
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
  const location = useLocation();

  const { claimQuery, handleApprove, handleReject, handleSendToQuality, isActionPending } = useClaimDetail(claimId);

  const [isApproveModalOpen, setApproveModalOpen] = useState(false);
  const [isForwardModalOpen, setForwardModalOpen] = useState(false);
  const [isRejectModalOpen, setRejectModalOpen] = useState(false);

  const handleBackClick = (): void => {
    navigate(`${ROUTES.CLAIMS}${location.search}`);
  };

  const openApproveModal = (): void => setApproveModalOpen(true);
  const openForwardModal = (): void => setForwardModalOpen(true);
  const openRejectModal = (): void => setRejectModalOpen(true);

  const closeApproveModal = (): void => setApproveModalOpen(false);
  const closeForwardModal = (): void => setForwardModalOpen(false);
  const closeRejectModal = (): void => setRejectModalOpen(false);

  const submitApprove = (values: ApproveClaimFinalFormValues): void => {
    handleApprove({ id: claimId, notes: values.notes, voucher: values.voucher });
    closeApproveModal();
  };

  const submitForward = (values: ForwardToQualityFormValues): void => {
    handleSendToQuality({ id: claimId, ...values });
    closeForwardModal();
  };

  const submitReject = (values: RejectClaimFinalFormValues): void => {
    handleReject({ id: claimId, notes: values.notes });
    closeRejectModal();
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
          <Button
            type='button'
            variant='outline'
            className='h-10 w-10 rounded-xl p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md'
            onClick={handleBackClick}
            aria-label='Back to claims'
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const claim = claimQuery.data;
  const canSendToQuality = claim.workflowState === 'IN_REVIEW';
  const canFinalApprove = claim.workflowState === 'QA_APPROVED';
  const canFinalReject = claim.workflowState === 'QA_REJECTED';

  return (
    <main className='space-y-4'>
      <section className='relative overflow-hidden rounded-3xl border border-primary/20 bg-[linear-gradient(120deg,#0d4ea8_0%,#2a7ddb_45%,#7fc5ff_100%)] p-5 text-white md:p-6'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_10%,rgba(255,255,255,0.3),transparent_42%)]'
        />
        <div className='relative flex items-start gap-3'>
          <Button
            type='button'
            variant='outline'
            className='h-10 w-10 rounded-xl border-[#0b1f3a] bg-[#0b1f3a] p-0 text-white shadow-[0_12px_24px_rgba(8,24,46,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#08182e] hover:text-white hover:shadow-[0_16px_30px_rgba(8,24,46,0.45)]'
            onClick={handleBackClick}
            aria-label='Back to claims'
          >
            <ArrowLeft className='h-4 w-4' />
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
            onOpenApproveModal={openApproveModal}
            onOpenForwardModal={openForwardModal}
            onOpenRejectModal={openRejectModal}
            isActionPending={isActionPending}
            canSendToQuality={canSendToQuality}
            canFinalApprove={canFinalApprove}
            canFinalReject={canFinalReject}
          />
          <ClaimWorkflowCard status={claim.status} workflowState={claim.workflowState} />
        </div>
      </section>

      <ApproveClaimModal
        isOpen={isApproveModalOpen}
        isSubmitting={isActionPending}
        claim={claim}
        onClose={closeApproveModal}
        onSubmit={submitApprove}
      />

      <ForwardToQualityModal
        isOpen={isForwardModalOpen}
        isSubmitting={isActionPending}
        onClose={closeForwardModal}
        onSubmit={submitForward}
      />

      <RejectClaimModal
        isOpen={isRejectModalOpen}
        isSubmitting={isActionPending}
        claim={claim}
        onClose={closeRejectModal}
        onSubmit={submitReject}
      />
    </main>
  );
};
