import { useEffect, useRef } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { queryKeys } from '#/constants';
import {
  getClaimById,
  useApproveClaimMutation,
  useMarkClaimInReviewMutation,
  useRejectClaimMutation,
  useSendToQualityMutation,
  useSubmitClaimCsrResubmissionMutation,
} from '#/data-layer/claims';
import type {
  ApproveClaimPayload,
  ClaimCsrResubmissionSubmitPayload,
  ClaimDetail,
  RejectClaimPayload,
  SendToQualityPayload,
} from '#/types/claims.types';
import { createClaimApprovedTemplate, createClaimRejectedTemplate, getApiErrorMessage } from '#/utils';

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
    sendToQualityMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Claim forwarded to quality.');
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
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
      const claim = claimQuery.data;
      if (!claim) {
        toast.error('Claim detail is not available.');
        return;
      }

      approveMutation.mutate(
        {
          ...payload,
          notificationTemplate: createClaimApprovedTemplate(claim, payload.notes?.trim() || 'Claim approved.'),
        },
        {
          onSuccess: () => {
            toast.success('Claim finalized as approved.');
          },
          onError: error => {
            toast.error(getApiErrorMessage(error));
          },
        }
      );
    },
    handleReject: payload => {
      const claim = claimQuery.data;
      if (!claim) {
        toast.error('Claim detail is not available.');
        return;
      }

      rejectMutation.mutate(
        {
          ...payload,
          notificationTemplate: createClaimRejectedTemplate(claim, payload.notes),
        },
        {
          onSuccess: () => {
            toast.success('Claim finalized as rejected.');
          },
          onError: error => {
            toast.error(getApiErrorMessage(error));
          },
        }
      );
    },
    handleClaimCsrResubmissionSubmit: payload => {
      submitClaimCsrResubmissionMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Resubmission submitted and claim moved to QA review.');
        },
        onError: error => {
          toast.error(getApiErrorMessage(error));
        },
      });
    },
    handleSendToQuality,
    isActionPending,
  };
};
