import { useEffect, useRef } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { CLAIM_MESSAGES, QUALITY_MESSAGES, queryKeys } from '#/constants';
import {
  getClaimById,
  useApproveClaimMutation,
  useMarkClaimInReviewMutation,
  useRejectClaimMutation,
  useSendToQualityMutation,
  useSubmitClaimCsrResubmissionMutation,
} from '#/data-layer/claims';
import {
  useApproveQualityClaimMutation,
  useRejectQualityClaimMutation,
  useRequestMoreInfoQAMutation,
} from '#/data-layer/quality';
import { executeGuardedDetailMutation, executeMutationWithFeedback } from '#/hooks/common/detailActionController';
import type {
  ApproveClaimPayload,
  ClaimCsrResubmissionSubmitPayload,
  ClaimDetail,
  RejectClaimPayload,
  SendToQualityPayload,
} from '#/types/claims.types';
import type { QualityApprovePayload, QualityRejectPayload, QualityRequestInfoPayload } from '#/types/quality.types';
import { createClaimApprovedTemplate, createClaimRejectedTemplate } from '#/utils';

interface UseClaimDetailResult {
  claimQuery: UseQueryResult<ClaimDetail, Error>;
  handleApprove: (payload: ApproveClaimPayload) => void;
  handleClaimCsrResubmissionSubmit: (payload: ClaimCsrResubmissionSubmitPayload) => void;
  handleReject: (payload: RejectClaimPayload) => void;
  handleQaApprove: (payload: QualityApprovePayload) => void;
  handleQaReject: (payload: QualityRejectPayload) => void;
  handleQaRequestInfo: (payload: QualityRequestInfoPayload) => void;
  handleSendToQuality: (payload: SendToQualityPayload) => void;
  isActionPending: boolean;
}

/**
 * useClaimDetail manages claim detail query and action mutations.
 *
 * @param id - Claim identifier from route params.
 * @returns Detail query and action handlers.
 */
export const useClaimDetail = (id: string): UseClaimDetailResult => {
  const hasAttemptedAutoInReviewRef = useRef(false);

  const claimQuery = useQuery<ClaimDetail, Error>({
    queryKey: queryKeys.claims.detail(id),
    queryFn: () => getClaimById(id),
    enabled: id.length > 0,
  });

  const approveMutation = useApproveClaimMutation();
  const markInReviewMutation = useMarkClaimInReviewMutation();
  const qaApproveMutation = useApproveQualityClaimMutation();
  const qaRejectMutation = useRejectQualityClaimMutation();
  const qaRequestInfoMutation = useRequestMoreInfoQAMutation();
  const rejectMutation = useRejectClaimMutation();
  const sendToQualityMutation = useSendToQualityMutation();
  const submitClaimCsrResubmissionMutation = useSubmitClaimCsrResubmissionMutation();

  useEffect(() => {
    hasAttemptedAutoInReviewRef.current = false;
  }, [id]);

  useEffect(() => {
    if (!id || !claimQuery.data) {
      return;
    }

    if (hasAttemptedAutoInReviewRef.current) {
      return;
    }
    if (claimQuery.data.workflowState !== 'SUBMITTED') {
      return;
    }

    hasAttemptedAutoInReviewRef.current = true;
    markInReviewMutation.mutate({ id });
  }, [claimQuery.data, id, markInReviewMutation]);

  const handleSendToQuality = (payload: SendToQualityPayload): void => {
    executeMutationWithFeedback({
      mutate: sendToQualityMutation.mutate,
      payload,
      successMessage: CLAIM_MESSAGES.FORWARDED_TO_QUALITY,
    });
  };

  const isActionPending =
    approveMutation.isPending ||
    markInReviewMutation.isPending ||
    qaApproveMutation.isPending ||
    qaRejectMutation.isPending ||
    qaRequestInfoMutation.isPending ||
    rejectMutation.isPending ||
    sendToQualityMutation.isPending ||
    submitClaimCsrResubmissionMutation.isPending;

  return {
    claimQuery,
    handleApprove: payload => {
      executeGuardedDetailMutation({
        detail: claimQuery.data,
        missingDetailMessage: CLAIM_MESSAGES.DETAIL_UNAVAILABLE,
        payload,
        buildPayload: (claim, actionPayload) => ({
          ...actionPayload,
          notificationTemplate: createClaimApprovedTemplate(claim, actionPayload.notes?.trim() || 'Claim approved.'),
        }),
        mutate: approveMutation.mutate,
        successMessage: CLAIM_MESSAGES.FINALIZED_APPROVED,
      });
    },
    handleReject: payload => {
      executeGuardedDetailMutation({
        detail: claimQuery.data,
        missingDetailMessage: CLAIM_MESSAGES.DETAIL_UNAVAILABLE,
        payload,
        buildPayload: (claim, actionPayload) => ({
          ...actionPayload,
          notificationTemplate: createClaimRejectedTemplate(claim, actionPayload.notes),
        }),
        mutate: rejectMutation.mutate,
        successMessage: CLAIM_MESSAGES.FINALIZED_REJECTED,
      });
    },
    handleClaimCsrResubmissionSubmit: payload => {
      executeMutationWithFeedback({
        mutate: submitClaimCsrResubmissionMutation.mutate,
        payload,
        successMessage: CLAIM_MESSAGES.RESUBMISSION_SUBMITTED,
      });
    },
    handleQaApprove: payload => {
      executeGuardedDetailMutation({
        detail: claimQuery.data,
        missingDetailMessage: CLAIM_MESSAGES.DETAIL_UNAVAILABLE,
        payload,
        buildPayload: (_claim, actionPayload) => actionPayload,
        mutate: qaApproveMutation.mutate,
        successMessage: QUALITY_MESSAGES.TECHNICAL_APPROVAL_SUBMITTED,
      });
    },
    handleQaReject: payload => {
      executeGuardedDetailMutation({
        detail: claimQuery.data,
        missingDetailMessage: CLAIM_MESSAGES.DETAIL_UNAVAILABLE,
        payload,
        buildPayload: (_claim, actionPayload) => actionPayload,
        mutate: qaRejectMutation.mutate,
        successMessage: QUALITY_MESSAGES.TECHNICAL_REJECTION_SUBMITTED,
      });
    },
    handleQaRequestInfo: payload => {
      executeMutationWithFeedback({
        mutate: qaRequestInfoMutation.mutate,
        payload,
        successMessage: QUALITY_MESSAGES.INFORMATION_REQUEST_SENT,
      });
    },
    handleSendToQuality,
    isActionPending,
  };
};
