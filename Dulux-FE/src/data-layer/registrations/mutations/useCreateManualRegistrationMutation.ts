import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys, REGISTRATION_INVOICE_TYPES, REGISTRATION_PRODUCT_TYPES } from '#/constants';
import { getActiveProductIdByNameRequest } from '#/data-layer/products/queries';
import { performRequest } from '#/services';
import type {
  ManualRegistrationApiResponse,
  ManualRegistrationFormValues,
  ManualRegistrationSubmissionResult,
} from '#/types/manualRegistration';
import { normalizeManualRegistrationCreateResponse } from '#/utils';
import { uploadRegistrationImageRequest } from './useUploadRegistrationImageMutation';

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

const buildCreateRegistrationPayload = async (
  values: ManualRegistrationFormValues
): Promise<RegistrationCreatePayload> => {
  if (!values.topcoatInvoice) {
    throw new Error('Topcoat invoice is required before submitting registration.');
  }

  const topcoatId = await getActiveProductIdByNameRequest({
    name: values.topcoatProductName,
    productType: REGISTRATION_PRODUCT_TYPES.TOPCOAT,
  });
  const basecoatId = values.basecoatProductName
    ? await getActiveProductIdByNameRequest({
        name: values.basecoatProductName,
        productType: REGISTRATION_PRODUCT_TYPES.BASECOAT,
      })
    : undefined;
  const topcoatInvoiceId = await uploadRegistrationImageRequest({ image: values.topcoatInvoice });
  const basecoatInvoiceId = values.basecoatInvoice
    ? await uploadRegistrationImageRequest({ image: values.basecoatInvoice })
    : undefined;

  const paintPair: RegistrationCreatePaintPair = {
    topcoat: topcoatId,
    topcoatQuantity: values.topcoatQuantity,
  };

  if (basecoatId && values.basecoatQuantity) {
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
