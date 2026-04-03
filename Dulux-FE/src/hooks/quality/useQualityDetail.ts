/* eslint import/order: off */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import {
  getQualityClaimById,
  useApproveQualityClaimMutation,
  useRejectQualityClaimMutation,
  useRequestMoreInfoQAMutation,
} from '#/data-layer/quality';
import type {
  QualityApprovePayload,
  QualityDetail,
  QualityRejectPayload,
  QualityRequestInfoPayload,
} from '#/types/quality.types';
import { getApiErrorMessage } from '#/utils';

import { queryKeys } from '#/constants';

interface UseQualityDetailResult {
  qualityDetailQuery: UseQueryResult<QualityDetail, Error>;
  handleApprove: (payload: QualityApprovePayload) => void;
  handleReject: (payload: QualityRejectPayload) => void;
  handleRequestInfo: (payload: QualityRequestInfoPayload) => void;
  isActionPending: boolean;
}

/**
 * useQualityDetail manages quality detail query and QA decision actions.
 *
 * @param id - Claim identifier from route params.
 * @returns Detail query and QA action handlers.
 */
export const useQualityDetail = (id: string): UseQualityDetailResult => {
  const qualityDetailQuery = useQuery<QualityDetail, Error>({
    queryKey: queryKeys.quality.detail(id),
    queryFn: () => getQualityClaimById(id),
    enabled: id.length > 0,
  });

  const approveMutation = useApproveQualityClaimMutation();
  const rejectMutation = useRejectQualityClaimMutation();
  const requestInfoMutation = useRequestMoreInfoQAMutation();

  const handleApprove = (payload: QualityApprovePayload): void => {
    approveMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Technical approval submitted.');
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  const handleReject = (payload: QualityRejectPayload): void => {
    rejectMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Technical rejection submitted.');
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  const handleRequestInfo = (payload: QualityRequestInfoPayload): void => {
    requestInfoMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Information request sent.');
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  return {
    qualityDetailQuery,
    handleApprove,
    handleReject,
    handleRequestInfo,
    isActionPending: approveMutation.isPending || rejectMutation.isPending || requestInfoMutation.isPending,
  };
};
