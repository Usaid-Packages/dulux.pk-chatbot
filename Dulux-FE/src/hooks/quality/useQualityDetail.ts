import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '#/constants';
import {
  getQualityClaimById,
  useApproveQualityClaimMutation,
  useRejectQualityClaimMutation,
  useRequestMoreInfoQAMutation,
} from '#/data-layer/quality';
import { executeGuardedDetailMutation, executeMutationWithFeedback } from '#/hooks/common/detailActionController';
import type {
  QualityApprovePayload,
  QualityDetail,
  QualityRejectPayload,
  QualityRequestInfoPayload,
} from '#/types/quality.types';

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
    executeGuardedDetailMutation({
      detail: qualityDetailQuery.data,
      missingDetailMessage: 'Claim detail is not available.',
      payload,
      buildPayload: (_detail, actionPayload) => actionPayload,
      mutate: approveMutation.mutate,
      successMessage: 'Technical approval submitted.',
    });
  };

  const handleReject = (payload: QualityRejectPayload): void => {
    executeGuardedDetailMutation({
      detail: qualityDetailQuery.data,
      missingDetailMessage: 'Claim detail is not available.',
      payload,
      buildPayload: (_detail, actionPayload) => actionPayload,
      mutate: rejectMutation.mutate,
      successMessage: 'Technical rejection submitted.',
    });
  };

  const handleRequestInfo = (payload: QualityRequestInfoPayload): void => {
    executeMutationWithFeedback({
      mutate: requestInfoMutation.mutate,
      payload,
      successMessage: 'Information request sent.',
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
