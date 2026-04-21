import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, POST, queryKeys, REGISTRATION_HTTP_METHODS, REGISTRATION_INVOICE_TYPES } from '#/constants';
import { performRequest } from '#/services';
import type { RegistrationEditPayload } from '#/types/registrations';

interface EditRegistrationVariables {
  id: string;
  payload: RegistrationEditPayload;
  invoiceFiles: File[];
}

interface UploadImageResponse {
  id: number;
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
 * Updates editable registration details and appends user-id edit note.
 *
 * @returns Registration edit mutation result.
 */
export const useEditRegistrationMutation = (): UseMutationResult<void, Error, EditRegistrationVariables> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, EditRegistrationVariables>({
    mutationFn: async ({ id, payload, invoiceFiles }: EditRegistrationVariables): Promise<void> => {
      const normalizedPayload: RegistrationEditPayload = {
        ...payload,
      };

      if (invoiceFiles.length > 0) {
        const uploadedImageIds = await Promise.all(invoiceFiles.map(file => uploadRegistrationInvoiceImage(file)));
        const uploadedInvoices = uploadedImageIds.map(imageId => ({
          imageId,
          invoiceType: REGISTRATION_INVOICE_TYPES.TOPCOAT,
        }));

        normalizedPayload.paintPairInvoices = [...(payload.paintPairInvoices ?? []), ...uploadedInvoices];
      }

      await performRequest<void, RegistrationEditPayload>({
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
