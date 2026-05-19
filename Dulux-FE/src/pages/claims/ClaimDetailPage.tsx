import type { JSX } from 'react';
import { useState } from 'react';

import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { AuditTimelinePanel } from '#/components/auditLogs';
import {
  ApproveClaimModal,
  ClaimDetailPanel,
  ClaimImages,
  ClaimWorkflowCard,
  CsrResubmissionModal,
  ForwardToQualityModal,
  LinkedRegistrationCard,
  RejectClaimModal,
} from '#/components/claims';
import {
  ApproveClaimModal as QualityApproveClaimModal,
  QualityResubmissionCard,
  RejectClaimQAModal,
  RequestInfoQAModal,
} from '#/components/quality';
import { Button, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { APP_USER_ROLES, ROUTES, normalizeAppUserRole } from '#/constants';
import { useAuthContext } from '#/context';
import { useClaimDetail } from '#/hooks/claims';
import type {
  ApproveClaimFinalFormValues,
  ClaimCsrResubmissionFormValues,
  ForwardToQualityFormValues,
  RejectClaimFinalFormValues,
} from '#/schemas/claim.schema';
import type {
  QualityApproveFormValues,
  QualityRejectFormValues,
  QualityRequestInfoFormValues,
} from '#/schemas/quality.schema';

/**
 * ClaimDetailPage renders full claim detail, evidence, workflow, and action modals.
 *
 * @returns Claim detail route page.
 */
export const ClaimDetailPage = (): JSX.Element => {
  const params = useParams<{ id: string }>();
  const claimId = params.id ?? '';

  const { user } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    claimQuery,
    handleApprove,
    handleClaimCsrResubmissionSubmit,
    handleReject,
    handleQaApprove,
    handleQaReject,
    handleQaRequestInfo,
    handleSendToQuality,
    isActionPending,
  } = useClaimDetail(claimId);

  const [isApproveModalOpen, setApproveModalOpen] = useState(false);
  const [isCsrResubmissionModalOpen, setCsrResubmissionModalOpen] = useState(false);
  const [isForwardModalOpen, setForwardModalOpen] = useState(false);
  const [isQaApproveModalOpen, setQaApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setRejectModalOpen] = useState(false);
  const [isQaRejectModalOpen, setQaRejectModalOpen] = useState(false);
  const [isQaRequestInfoModalOpen, setQaRequestInfoModalOpen] = useState(false);

  const handleBackClick = (): void => {
    navigate(`${ROUTES.CLAIMS}${location.search}`);
  };

  const openApproveModal = (): void => setApproveModalOpen(true);
  const openCsrResubmissionModal = (): void => setCsrResubmissionModalOpen(true);
  const openForwardModal = (): void => setForwardModalOpen(true);
  const openQaApproveModal = (): void => setQaApproveModalOpen(true);
  const openQaRejectModal = (): void => setQaRejectModalOpen(true);
  const openQaRequestInfoModal = (): void => setQaRequestInfoModalOpen(true);
  const openRejectModal = (): void => setRejectModalOpen(true);

  const closeApproveModal = (): void => setApproveModalOpen(false);
  const closeCsrResubmissionModal = (): void => setCsrResubmissionModalOpen(false);
  const closeForwardModal = (): void => setForwardModalOpen(false);
  const closeQaApproveModal = (): void => setQaApproveModalOpen(false);
  const closeQaRejectModal = (): void => setQaRejectModalOpen(false);
  const closeQaRequestInfoModal = (): void => setQaRequestInfoModalOpen(false);
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

  const submitCsrResubmission = (values: ClaimCsrResubmissionFormValues): void => {
    handleClaimCsrResubmissionSubmit({
      id: claimId,
      notes: values.notes,
      entries: values.entries.map(entry => ({
        requiredItem: entry.requiredItem,
        responseText: entry.responseText,
        imageFile: entry.imageFile,
      })),
    });
    closeCsrResubmissionModal();
  };

  const submitQaApprove = (values: QualityApproveFormValues): void => {
    handleQaApprove({ id: claimId, ...values });
    closeQaApproveModal();
  };

  const submitQaReject = (values: QualityRejectFormValues): void => {
    handleQaReject({ id: claimId, ...values });
    closeQaRejectModal();
  };

  const submitQaRequestInfo = (values: QualityRequestInfoFormValues): void => {
    handleQaRequestInfo({ id: claimId, ...values });
    closeQaRequestInfoModal();
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
  const normalizedRole = normalizeAppUserRole(user?.role);
  const isAdmin = normalizedRole === APP_USER_ROLES.ADMIN;
  const canCsrResubmit = claim.workflowState === 'RESUBMIT';
  const canSendToQuality = claim.workflowState === 'IN_REVIEW';
  const canFinalApprove = claim.workflowState === 'QA_APPROVED';
  const canFinalReject = claim.workflowState === 'QA_REJECTED';
  const canQaApprove = isAdmin && claim.workflowState === 'QA_REVIEW';
  const canQaReject = isAdmin && claim.workflowState === 'QA_REVIEW';
  const canQaRequestInfo = isAdmin && claim.workflowState === 'QA_REVIEW';

  return (
    <main className='space-y-4'>
      <section className='grid gap-4 lg:grid-cols-[1fr_340px]'>
        <div className='space-y-4'>
          <ClaimImages photos={claim.evidencePhotos} />
          <QualityResubmissionCard latestResubmission={claim.latestResubmission} />
          <LinkedRegistrationCard registration={claim.linkedRegistration} />
          <AuditTimelinePanel
            type='claim'
            objectId={claimId}
            title='Latest Timeline Changes'
            subtitle='Detailed admin activity log'
          />
        </div>

        <div className='space-y-4'>
          <ClaimDetailPanel
            claim={claim}
            onOpenApproveModal={openApproveModal}
            onOpenCsrResubmissionModal={openCsrResubmissionModal}
            onOpenForwardModal={openForwardModal}
            onOpenQaApproveModal={openQaApproveModal}
            onOpenQaRejectModal={openQaRejectModal}
            onOpenQaRequestInfoModal={openQaRequestInfoModal}
            onOpenRejectModal={openRejectModal}
            isActionPending={isActionPending}
            canCsrResubmit={canCsrResubmit}
            canSendToQuality={canSendToQuality}
            canFinalApprove={canFinalApprove}
            canFinalReject={canFinalReject}
            canQaApprove={canQaApprove}
            canQaReject={canQaReject}
            canQaRequestInfo={canQaRequestInfo}
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

      <CsrResubmissionModal
        claimId={claimId}
        isOpen={isCsrResubmissionModalOpen}
        isSubmitting={isActionPending}
        onClose={closeCsrResubmissionModal}
        onSubmit={submitCsrResubmission}
      />

      <RejectClaimModal
        isOpen={isRejectModalOpen}
        isSubmitting={isActionPending}
        claim={claim}
        onClose={closeRejectModal}
        onSubmit={submitReject}
      />

      <QualityApproveClaimModal
        isOpen={isQaApproveModalOpen}
        isSubmitting={isActionPending}
        onClose={closeQaApproveModal}
        onSubmit={submitQaApprove}
      />

      <RejectClaimQAModal
        isOpen={isQaRejectModalOpen}
        isSubmitting={isActionPending}
        onClose={closeQaRejectModal}
        onSubmit={submitQaReject}
      />

      <RequestInfoQAModal
        isOpen={isQaRequestInfoModalOpen}
        isSubmitting={isActionPending}
        onClose={closeQaRequestInfoModal}
        onSubmit={submitQaRequestInfo}
      />
    </main>
  );
};
