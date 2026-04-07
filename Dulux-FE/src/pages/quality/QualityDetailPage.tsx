import type { JSX } from 'react';
import { useState } from 'react';

import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { ClaimTimeline, ClaimWorkflowCard, LinkedRegistrationCard } from '#/components/claims';
import {
  ApproveClaimModal,
  QualityAgentNotesCard,
  QualityDecisionPanel,
  QualityEvidencePhotos,
  QualityQuickInfoCard,
  RejectClaimQAModal,
  RequestInfoQAModal,
} from '#/components/quality';
import { Button, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { ROUTES, getClaimIssueTypeLabel } from '#/constants';
import { useQualityDetail } from '#/hooks/quality';
import type {
  QualityApproveFormValues,
  QualityRejectFormValues,
  QualityRequestInfoFormValues,
} from '#/schemas/quality.schema';

/**
 * QualityDetailPage renders QA review details and technical decision actions.
 *
 * @returns Quality detail page.
 */
export const QualityDetailPage = (): JSX.Element => {
  const params = useParams<{ id: string }>();
  const claimId = params.id ?? '';

  const navigate = useNavigate();
  const { qualityDetailQuery, handleApprove, handleReject, handleRequestInfo, isActionPending } =
    useQualityDetail(claimId);

  const [isApproveModalOpen, setApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setRejectModalOpen] = useState(false);
  const [isRequestInfoModalOpen, setRequestInfoModalOpen] = useState(false);

  const handleBackClick = (): void => {
    navigate(ROUTES.QUALITY);
  };

  const openApproveModal = (): void => {
    setApproveModalOpen(true);
  };

  const openRejectModal = (): void => {
    setRejectModalOpen(true);
  };

  const openRequestInfoModal = (): void => {
    setRequestInfoModalOpen(true);
  };

  const closeApproveModal = (): void => {
    setApproveModalOpen(false);
  };

  const closeRejectModal = (): void => {
    setRejectModalOpen(false);
  };

  const closeRequestInfoModal = (): void => {
    setRequestInfoModalOpen(false);
  };

  const submitApprove = (values: QualityApproveFormValues): void => {
    handleApprove({ id: claimId, ...values });
    closeApproveModal();
  };

  const submitReject = (values: QualityRejectFormValues): void => {
    handleReject({ id: claimId, ...values });
    closeRejectModal();
  };

  const submitRequestInfo = (values: QualityRequestInfoFormValues): void => {
    handleRequestInfo({ id: claimId, ...values });
    closeRequestInfoModal();
  };

  if (qualityDetailQuery.isLoading) {
    return (
      <section className='space-y-3'>
        <Skeleton className='h-10 w-32' />
        <Skeleton className='h-10 w-full' />
        <Skeleton className='h-60 w-full' />
      </section>
    );
  }

  if (qualityDetailQuery.isError || !qualityDetailQuery.data) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyHeader>
            <EmptyTitle>Unable to load quality claim detail</EmptyTitle>
            <EmptyDescription>{qualityDetailQuery.error?.message ?? 'Claim not found.'}</EmptyDescription>
          </EmptyHeader>
          <Button type='button' variant='outline' onClick={handleBackClick}>
            <ArrowLeft className='h-4 w-4' />
            Back
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const claim = qualityDetailQuery.data;
  const isApproveDisabled = claim.status === 'approved' || claim.workflowState === 'APPROVED';

  return (
    <main className='space-y-4'>
      <Button type='button' variant='outline' onClick={handleBackClick}>
        <ArrowLeft className='h-4 w-4' />
        Back
      </Button>

      <section className='grid gap-4 lg:grid-cols-[1fr_340px]'>
        <div className='space-y-4'>
          <section className='wf-card wf-card-p4'>
            <div className='flex items-start justify-between gap-2'>
              <div>
                <h1 className='text-lg font-bold text-text-primary'>{claim.customerName}</h1>
                <p className='text-sm text-text-muted'>{claim.phone}</p>
              </div>
              <span className='chip-claim'>{claim.claimNumber}</span>
            </div>

            <dl className='mt-4 grid gap-2 text-sm'>
              <div className='flex justify-between gap-2'>
                <dt className='text-text-muted'>Issue Type</dt>
                <dd className='font-medium text-text-primary'>{getClaimIssueTypeLabel(claim.issueType)}</dd>
              </div>
              <div className='flex justify-between gap-2'>
                <dt className='text-text-muted'>Area</dt>
                <dd className='font-medium text-text-primary'>{claim.areaSqFt} sq ft</dd>
              </div>
              <div className='flex justify-between gap-2'>
                <dt className='text-text-muted'>Topcoat</dt>
                <dd className='font-medium text-text-primary'>{claim.topcoat}</dd>
              </div>
              <div className='flex justify-between gap-2'>
                <dt className='text-text-muted'>Batch Number</dt>
                <dd className='font-medium text-text-primary'>{claim.batchNumber}</dd>
              </div>
            </dl>

            <p className='mt-4 rounded-md bg-surface-muted p-3 text-sm text-text-primary'>{claim.description}</p>
          </section>

          <QualityAgentNotesCard notes={claim.csNotes} />
          <QualityEvidencePhotos photos={claim.evidencePhotos} />
          <LinkedRegistrationCard registration={claim.linkedRegistration} />
          <ClaimTimeline timeline={claim.timeline} />
        </div>

        <div className='space-y-4'>
          <QualityDecisionPanel
            isActionPending={isActionPending}
            isApproveDisabled={isApproveDisabled}
            onOpenApproveModal={openApproveModal}
            onOpenRequestInfoModal={openRequestInfoModal}
            onOpenRejectModal={openRejectModal}
          />
          <ClaimWorkflowCard status={claim.status} workflowState={claim.workflowState} />
          <QualityQuickInfoCard
            forwardedBy={claim.forwardedBy}
            forwardedAt={claim.forwardedAt}
            priority={claim.priority}
          />
        </div>
      </section>

      <ApproveClaimModal
        isOpen={isApproveModalOpen}
        isSubmitting={isActionPending}
        onClose={closeApproveModal}
        onSubmit={submitApprove}
      />

      <RejectClaimQAModal
        isOpen={isRejectModalOpen}
        isSubmitting={isActionPending}
        onClose={closeRejectModal}
        onSubmit={submitReject}
      />

      <RequestInfoQAModal
        isOpen={isRequestInfoModalOpen}
        isSubmitting={isActionPending}
        onClose={closeRequestInfoModal}
        onSubmit={submitRequestInfo}
      />
    </main>
  );
};
