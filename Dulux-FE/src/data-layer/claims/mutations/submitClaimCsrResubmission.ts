import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { POST, apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services/apiClient';
import type { ApiClaimDetail, ClaimCsrResubmissionSubmitRequestPayload } from '#/types/claims.api.types';
import type { ClaimCsrResubmissionSubmitPayload, ClaimDetail } from '#/types/claims.types';
import { normalizeClaimDetail } from '../normalizers';
import { uploadClaimImage } from './uploadClaimImage';

const toClaimCsrResubmissionPayload = async (
  payload: ClaimCsrResubmissionSubmitPayload
): Promise<ClaimCsrResubmissionSubmitRequestPayload> => {
  const entries = await Promise.all(
    payload.entries.map(async entry => {
      const imageId = entry.imageFile ? await uploadClaimImage(entry.imageFile) : undefined;
      const responseText = entry.responseText?.trim();

      return {
        required_item: entry.requiredItem,
        ...(responseText ? { response_text: responseText } : {}),
        ...(imageId ? { image_id: imageId } : {}),
      };
    })
  );

  const notes = payload.notes?.trim();

  return {
    ...(notes ? { notes } : {}),
    entries,
  };
};

export const submitClaimCsrResubmission = async (payload: ClaimCsrResubmissionSubmitPayload): Promise<ClaimDetail> => {
  const requestPayload = await toClaimCsrResubmissionPayload(payload);

  const response = await performRequest<ApiClaimDetail, ClaimCsrResubmissionSubmitRequestPayload>({
    method: POST,
    url: apiEndpoints.claims.csrResubmission(payload.id),
    payload: requestPayload,
  });

  return normalizeClaimDetail(response);
};

export const useSubmitClaimCsrResubmissionMutation = (): UseMutationResult<
  ClaimDetail,
  Error,
  ClaimCsrResubmissionSubmitPayload
> => {
  const queryClient = useQueryClient();

  return useMutation<ClaimDetail, Error, ClaimCsrResubmissionSubmitPayload>({
    mutationKey: queryKeys.claims.csrResubmissionSubmit,
    mutationFn: submitClaimCsrResubmission,
    onSuccess: updatedClaim => {
      queryClient.setQueryData(queryKeys.claims.detail(updatedClaim.id), updatedClaim);
      void queryClient.invalidateQueries({ queryKey: queryKeys.claims.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.quality.all });
    },
  });
};
