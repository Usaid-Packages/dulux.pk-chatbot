import { useEffect, useRef } from 'react';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { queryKeys } from '#/constants';
import {
  getClaimById,
  useApproveClaimMutation,
  useMarkClaimInReviewMutation,
  useRejectClaimMutation,
  useSendToQualityMutation,
} from '#/data-layer/claims';
import type { ApproveClaimPayload, ClaimDetail, RejectClaimPayload, SendToQualityPayload } from '#/types/claims.types';
import { createClaimApprovedTemplate, createClaimRejectedTemplate, getApiErrorMessage } from '#/utils';

interface UseClaimDetailResult {
  claimQuery: UseQueryResult<ClaimDetail, Error>;
  handleApprove: (payload: ApproveClaimPayload) => void;
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
    sendToQualityMutation.isPending;

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
    handleSendToQuality,
    isActionPending,
  };
};
