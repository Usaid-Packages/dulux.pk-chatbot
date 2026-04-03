import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { queryKeys } from '#/constants';
import {
  getClaimById,
  useApproveClaimMutation,
  useRejectClaimMutation,
  useRequestMoreInfoClaimMutation,
  useSendToQualityMutation,
} from '#/data-layer/claims';
import type {
  ApproveClaimPayload,
  ClaimDetail,
  RejectClaimPayload,
  RequestMoreInfoPayload,
  SendToQualityPayload,
} from '#/types/claims.types';
import { getApiErrorMessage } from '#/utils';

interface UseClaimDetailResult {
  claimQuery: UseQueryResult<ClaimDetail, Error>;
  handleApprove: (payload: ApproveClaimPayload) => void;
  handleReject: (payload: RejectClaimPayload) => void;
  handleSendToQuality: (payload: SendToQualityPayload) => void;
  handleRequestMoreInfo: (payload: RequestMoreInfoPayload) => void;
  isActionPending: boolean;
}

/**
 * useClaimDetail manages claim detail query and action mutations.
 *
 * @param id - Claim identifier from route params.
 * @returns Detail query and action handlers.
 */
export const useClaimDetail = (id: string): UseClaimDetailResult => {
  const claimQuery = useQuery<ClaimDetail, Error>({
    queryKey: queryKeys.claims.detail(id),
    queryFn: () => getClaimById(id),
    enabled: id.length > 0,
  });

  const approveMutation = useApproveClaimMutation();
  const rejectMutation = useRejectClaimMutation();
  const sendToQualityMutation = useSendToQualityMutation();
  const requestMoreInfoMutation = useRequestMoreInfoClaimMutation();

  const handleApprove = (payload: ApproveClaimPayload): void => {
    approveMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Claim approved successfully.');
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  const handleReject = (payload: RejectClaimPayload): void => {
    rejectMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Claim rejected successfully.');
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

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

  const handleRequestMoreInfo = (payload: RequestMoreInfoPayload): void => {
    requestMoreInfoMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('More information request sent.');
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  const isActionPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    sendToQualityMutation.isPending ||
    requestMoreInfoMutation.isPending;

  return {
    claimQuery,
    handleApprove,
    handleReject,
    handleSendToQuality,
    handleRequestMoreInfo,
    isActionPending,
  };
};
