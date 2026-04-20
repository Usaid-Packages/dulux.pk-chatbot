import { useEffect, useRef } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '#/constants';
import {
  getClaimById,
  useApproveClaimMutation,
  useMarkClaimInReviewMutation,
  useRejectClaimMutation,
  useSendToQualityMutation,
  useSubmitClaimCsrResubmissionMutation,
} from '#/data-layer/claims';
import { executeGuardedDetailMutation, executeMutationWithFeedback } from '#/hooks/common/detailActionController';
import type {
  ApproveClaimPayload,
  ClaimCsrResubmissionSubmitPayload,
  ClaimDetail,
  RejectClaimPayload,
  SendToQualityPayload,
} from '#/types/claims.types';
import { createClaimApprovedTemplate, createClaimRejectedTemplate } from '#/utils';

interface UseClaimDetailResult {
  claimQuery: UseQueryResult<ClaimDetail, Error>;
  handleApprove: (payload: ApproveClaimPayload) => void;
  handleClaimCsrResubmissionSubmit: (payload: ClaimCsrResubmissionSubmitPayload) => void;
  handleReject: (payload: RejectClaimPayload) => void;
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
      successMessage: 'Claim forwarded to quality.',
    });
  };

  const isActionPending =
    approveMutation.isPending ||
    markInReviewMutation.isPending ||
    rejectMutation.isPending ||
    sendToQualityMutation.isPending ||
    submitClaimCsrResubmissionMutation.isPending;

  return {
    claimQuery,
    handleApprove: payload => {
      executeGuardedDetailMutation({
        detail: claimQuery.data,
        missingDetailMessage: 'Claim detail is not available.',
        payload,
        buildPayload: (claim, actionPayload) => ({
          ...actionPayload,
          notificationTemplate: createClaimApprovedTemplate(claim, actionPayload.notes?.trim() || 'Claim approved.'),
        }),
        mutate: approveMutation.mutate,
        successMessage: 'Claim finalized as approved.',
      });
    },
    handleReject: payload => {
      executeGuardedDetailMutation({
        detail: claimQuery.data,
        missingDetailMessage: 'Claim detail is not available.',
        payload,
        buildPayload: (claim, actionPayload) => ({
          ...actionPayload,
          notificationTemplate: createClaimRejectedTemplate(claim, actionPayload.notes),
        }),
        mutate: rejectMutation.mutate,
        successMessage: 'Claim finalized as rejected.',
      });
    },
    handleClaimCsrResubmissionSubmit: payload => {
      executeMutationWithFeedback({
        mutate: submitClaimCsrResubmissionMutation.mutate,
        payload,
        successMessage: 'Resubmission submitted and claim moved to QA review.',
      });
    },
    handleSendToQuality,
    isActionPending,
  };
};
