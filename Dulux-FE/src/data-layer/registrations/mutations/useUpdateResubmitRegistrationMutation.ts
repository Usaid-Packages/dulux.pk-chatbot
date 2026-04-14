import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, POST, queryKeys, REGISTRATION_HTTP_METHODS, REGISTRATION_INVOICE_TYPES } from '#/constants';
import { performRequest } from '#/services';
import type { RegistrationResubmitUpdatePayload } from '#/types/registrations';

interface UploadImageResponse {
  id: number;
}

interface UpdateResubmitRegistrationVariables {
  id: string;
  payload: RegistrationResubmitUpdatePayload;
  invoiceFiles: File[];
}

const uploadRegistrationInvoiceImage = async (invoiceFile: File): Promise<number> => {
  const payload = new FormData();
  payload.append('image', invoiceFile);

  const response = await performRequest<UploadImageResponse, FormData>({
    method: POST,
    url: apiEndpoints.core.uploadImage,
    payload,
    config: {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  });

  return response.id;
};

/**
 * Updates registration fields requested in RESUBMIT state and refreshes related cache.
 *
 * @returns Registration resubmission-field update mutation result.
 */
export const useUpdateResubmitRegistrationMutation = (): UseMutationResult<
  void,
  Error,
  UpdateResubmitRegistrationVariables
> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateResubmitRegistrationVariables>({
    mutationFn: async ({ id, payload, invoiceFiles }: UpdateResubmitRegistrationVariables): Promise<void> => {
      const normalizedPayload: RegistrationResubmitUpdatePayload = {
        ...payload,
      };

      if (invoiceFiles.length > 0) {
        const uploadedImageIds = await Promise.all(invoiceFiles.map(file => uploadRegistrationInvoiceImage(file)));
        normalizedPayload.paintPairInvoices = uploadedImageIds.map(imageId => ({
          imageId,
          invoiceType: REGISTRATION_INVOICE_TYPES.TOPCOAT,
        }));
      }

      await performRequest<void, RegistrationResubmitUpdatePayload>({
        method: REGISTRATION_HTTP_METHODS.PATCH,
        url: apiEndpoints.registrations.detail(id),
        payload: normalizedPayload,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.detail(variables.id) });
    },
  });
};
