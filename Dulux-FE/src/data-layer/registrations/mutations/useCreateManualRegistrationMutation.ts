import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys, REGISTRATION_INVOICE_TYPES } from '#/constants';
import { performRequest } from '#/services';
import type {
  ManualRegistrationApiResponse,
  ManualRegistrationFormValues,
  ManualRegistrationSubmissionResult,
} from '#/types/manualRegistration';
import { normalizeManualRegistrationCreateResponse } from '#/utils';

interface RegistrationCreatePaintPair {
  topcoat: number;
  topcoatQuantity: string;
  basecoat?: number;
  basecoatQuantity?: string;
}

interface RegistrationCreateInvoice {
  imageId: number;
  invoiceType: (typeof REGISTRATION_INVOICE_TYPES)[keyof typeof REGISTRATION_INVOICE_TYPES];
}

interface RegistrationCreatePayload {
  channel: 'WEBFORM';
  customerName: string;
  phoneNumber: string;
  email: string;
  city: string;
  province: string;
  siteAddress: string;
  purchaseDate: string;
  purchaseDealer: string;
  purchaseDealerCity: string;
  purchaseDealerAddress: string;
  postalCode: string;
  notes: string;
  paintPairs: RegistrationCreatePaintPair[];
  paintPairInvoices: RegistrationCreateInvoice[];
}

interface UploadImageResponse {
  id: number;
}

const uploadRegistrationImage = async (image: File): Promise<number> => {
  const payload = new FormData();
  payload.append('image', image);

  const response = await performRequest<UploadImageResponse, FormData>({
    method: 'post',
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

const buildCreateRegistrationPayload = async (
  values: ManualRegistrationFormValues
): Promise<RegistrationCreatePayload> => {
  if (!values.topcoatInvoice) {
    throw new Error('Topcoat invoice is required before submitting registration.');
  }

  const topcoatId = Number.parseInt(values.topcoatProductId, 10);
  if (!Number.isFinite(topcoatId) || topcoatId <= 0) {
    throw new Error('A valid topcoat product is required before submitting registration.');
  }

  const basecoatId = values.basecoatProductId ? Number.parseInt(values.basecoatProductId, 10) : undefined;
  if (values.basecoatProductId && (!Number.isFinite(basecoatId) || (basecoatId ?? 0) <= 0)) {
    throw new Error('A valid basecoat product is required when basecoat is selected.');
  }

  const topcoatInvoiceId = await uploadRegistrationImage(values.topcoatInvoice);
  const basecoatInvoiceId = values.basecoatInvoice ? await uploadRegistrationImage(values.basecoatInvoice) : undefined;

  const paintPair: RegistrationCreatePaintPair = {
    topcoat: topcoatId,
    topcoatQuantity: values.topcoatQuantity,
  };

  if (basecoatId !== undefined && values.basecoatQuantity) {
    paintPair.basecoat = basecoatId;
    paintPair.basecoatQuantity = values.basecoatQuantity;
  }

  const paintPairInvoices: RegistrationCreateInvoice[] = [
    {
      imageId: topcoatInvoiceId,
      invoiceType: REGISTRATION_INVOICE_TYPES.TOPCOAT,
    },
  ];

  if (basecoatInvoiceId) {
    paintPairInvoices.push({
      imageId: basecoatInvoiceId,
      invoiceType: REGISTRATION_INVOICE_TYPES.BASECOAT,
    });
  }

  return {
    channel: 'WEBFORM',
    customerName: values.customerName.trim(),
    phoneNumber: values.phoneNumber.trim(),
    email: values.email.trim(),
    city: values.city.trim(),
    province: values.province.trim(),
    siteAddress: values.siteAddress.trim(),
    purchaseDate: values.purchaseDate.trim(),
    purchaseDealer: values.purchaseDealer.trim(),
    purchaseDealerCity: values.purchaseDealerCity.trim(),
    purchaseDealerAddress: values.purchaseDealerAddress.trim(),
    postalCode: values.postalCode.trim(),
    notes: values.notes.trim(),
    paintPairs: [paintPair],
    paintPairInvoices,
  };
};

/**
 * Creates a manual registration and refreshes registration caches.
 *
 * @returns Manual registration creation mutation result.
 */
export const useCreateManualRegistrationMutation = (): UseMutationResult<
  ManualRegistrationSubmissionResult,
  Error,
  ManualRegistrationFormValues
> => {
  const queryClient = useQueryClient();

  return useMutation<ManualRegistrationSubmissionResult, Error, ManualRegistrationFormValues>({
    mutationKey: queryKeys.registrations.manualCreate,
    mutationFn: async (values: ManualRegistrationFormValues): Promise<ManualRegistrationSubmissionResult> => {
      const payload = await buildCreateRegistrationPayload(values);
      const response = await performRequest<ManualRegistrationApiResponse, RegistrationCreatePayload>({
        method: 'post',
        url: apiEndpoints.registrations.createManual,
        payload,
      });

      return normalizeManualRegistrationCreateResponse(response);
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });
      if (data.id > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.registrations.detail(String(data.id)) });
      }
    },
  });
};
