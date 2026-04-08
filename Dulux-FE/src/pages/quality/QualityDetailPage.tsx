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
  QualityResubmissionCard,
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
          <Button
            type='button'
            variant='outline'
            className='h-10 w-10 rounded-xl p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md'
            onClick={handleBackClick}
            aria-label='Back to quality queue'
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const claim = qualityDetailQuery.data;
  const canTakeDecision = claim.workflowState === 'QA_REVIEW';
  const normalizedDescription = claim.description.trim();
  const normalizedCsNotes = claim.csNotes?.trim();
  const shouldShowDescription = Boolean(normalizedDescription) && normalizedDescription !== normalizedCsNotes;

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
            aria-label='Back to quality queue'
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[2px] text-blue-100'>Quality Assessment</p>
            <h1 className='mt-1 text-2xl font-extrabold tracking-tight text-white'>{claim.customerName}</h1>
            <p className='text-sm text-blue-50/90'>Conduct technical review and submit final quality decision.</p>
          </div>
        </div>
      </section>

      <section className='grid gap-4 lg:grid-cols-[1fr_340px]'>
        <div className='space-y-4'>
          <section className='wf-card wf-card-p4 border-primary/15 bg-[linear-gradient(170deg,#ffffff_0%,#f1f7ff_100%)]'>
            <div className='flex items-start justify-between gap-2'>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-[1.5px] text-primary'>Claim Profile</p>
                <h1 className='text-lg font-bold text-text-primary'>{claim.customerName}</h1>
                <p className='text-sm text-text-muted'>{claim.phone}</p>
              </div>
              <span className='chip-claim'>{claim.claimNumber}</span>
            </div>

            <dl className='mt-4 grid gap-2 text-sm'>
              <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
                <dt className='text-text-muted'>Issue Type</dt>
                <dd className='font-medium text-text-primary'>{getClaimIssueTypeLabel(claim.issueType)}</dd>
              </div>
              <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
                <dt className='text-text-muted'>Area</dt>
                <dd className='font-medium text-text-primary'>{claim.areaSqFt} sq ft</dd>
              </div>
              <div className='flex justify-between gap-3 border-b border-border/50 pb-1'>
                <dt className='text-text-muted'>Topcoat</dt>
                <dd className='font-medium text-text-primary'>{claim.topcoat}</dd>
              </div>
              <div className='flex justify-between gap-3'>
                <dt className='text-text-muted'>Batch Number</dt>
                <dd className='font-medium text-text-primary'>{claim.batchNumber}</dd>
              </div>
            </dl>

            {shouldShowDescription ? (
              <p className='mt-4 rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-text-primary'>
                {claim.description}
              </p>
            ) : null}
          </section>

          <QualityAgentNotesCard notes={claim.csNotes} />
          <QualityEvidencePhotos photos={claim.evidencePhotos} />
          <QualityResubmissionCard latestResubmission={claim.latestResubmission} />
          <LinkedRegistrationCard registration={claim.linkedRegistration} />
          <ClaimTimeline timeline={claim.timeline} />
        </div>

        <div className='space-y-4'>
          <QualityDecisionPanel
            isActionPending={isActionPending}
            canTakeDecision={canTakeDecision}
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
        claim={claim}
        onClose={closeApproveModal}
        onSubmit={submitApprove}
      />

      <RejectClaimQAModal
        isOpen={isRejectModalOpen}
        isSubmitting={isActionPending}
        claim={claim}
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
