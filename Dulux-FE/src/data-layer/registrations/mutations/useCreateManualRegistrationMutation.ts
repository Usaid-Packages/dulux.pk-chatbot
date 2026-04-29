import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, POST, queryKeys, REGISTRATION_INVOICE_TYPES } from '#/constants';
import { performRequest } from '#/services';
import type {
  ManualRegistrationApiResponse,
  ManualRegistrationFormValues,
  ManualRegistrationPaintPairInput,
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
  siteAddress: string;
  purchaseDate: string;
  purchaseDealer: string;
  purchaseDealerCity: string;
  purchaseDealerAddress: string;
  postalCode?: string;
  notes: string;
  paintPairs: RegistrationCreatePaintPair[];
  paintPairInvoices: RegistrationCreateInvoice[];
}

interface UploadImageResponse {
  id: number;
}

const PAKISTAN_PHONE_REGEX = /^923\d{9}$/;

const normalizePakistanPhoneNumber = (phoneNumber: string): string => {
  const digits = phoneNumber.replace(/\D/g, '');
  return digits;
};

const uploadRegistrationImage = async (image: File): Promise<number> => {
  const payload = new FormData();
  payload.append('image', image);

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

const buildCreateRegistrationPayload = async (
  values: ManualRegistrationFormValues
): Promise<RegistrationCreatePayload> => {
  const normalizedPhoneNumber = normalizePakistanPhoneNumber(values.phoneNumber);
  if (!PAKISTAN_PHONE_REGEX.test(normalizedPhoneNumber)) {
    throw new Error('Phone number must be in 923XXXXXXXXX format.');
  }
  const allPaintPairValues: ManualRegistrationPaintPairInput[] = [
    {
      selectionType: values.selectionType,
      specialistProductId: values.specialistProductId,
      specialistQuantity: values.specialistQuantity,
      topcoatProductId: values.topcoatProductId,
      topcoatQuantity: values.topcoatQuantity,
      basecoatProductId: values.basecoatProductId,
      basecoatQuantity: values.basecoatQuantity,
    },
    ...(values.additionalPaintPairs ?? []),
  ];

  const paintPairs: RegistrationCreatePaintPair[] = [];
  const paintPairInvoices: RegistrationCreateInvoice[] = [];

  for (const pairValues of allPaintPairValues) {
    const isSpecialistPair = pairValues.selectionType === 'SPECIALIST';
    const isTopcoatPair = pairValues.selectionType === 'TOPCOAT';

    if (!isSpecialistPair && !isTopcoatPair) {
      throw new Error('Select paint type for each paint pair before submitting registration.');
    }

    const selectedPrimaryProductId = isSpecialistPair ? pairValues.specialistProductId : pairValues.topcoatProductId;
    const topcoatId = Number.parseInt(selectedPrimaryProductId, 10);
    if (!Number.isFinite(topcoatId) || topcoatId <= 0) {
      throw new Error('A valid topcoat or specialist product is required before submitting registration.');
    }

    const basecoatId = pairValues.basecoatProductId ? Number.parseInt(pairValues.basecoatProductId, 10) : undefined;
    if (pairValues.basecoatProductId && (!Number.isFinite(basecoatId) || (basecoatId ?? 0) <= 0)) {
      throw new Error('A valid basecoat product is required when basecoat is selected.');
    }

    const paintPair: RegistrationCreatePaintPair = {
      topcoat: topcoatId,
      topcoatQuantity: isSpecialistPair ? pairValues.specialistQuantity : pairValues.topcoatQuantity,
    };

    if (isTopcoatPair && basecoatId !== undefined && pairValues.basecoatQuantity) {
      paintPair.basecoat = basecoatId;
      paintPair.basecoatQuantity = pairValues.basecoatQuantity;
    }

    paintPairs.push(paintPair);
  }

  if (!values.invoices || values.invoices.length === 0) {
    throw new Error('At least one invoice is required before submitting registration.');
  }

  for (const invoice of values.invoices) {
    const invoiceImageId = await uploadRegistrationImage(invoice);
    paintPairInvoices.push({
      imageId: invoiceImageId,
      invoiceType: REGISTRATION_INVOICE_TYPES.TOPCOAT,
    });
  }

  const normalizedPostalCode = values.postalCode.trim();

  return {
    channel: 'WEBFORM',
    customerName: values.customerName.trim(),
    phoneNumber: normalizedPhoneNumber,
    email: values.email.trim(),
    city: values.city.trim(),
    siteAddress: values.siteAddress.trim(),
    purchaseDate: values.purchaseDate.trim(),
    purchaseDealer: values.purchaseDealer.trim(),
    purchaseDealerCity: values.purchaseDealerCity.trim(),
    purchaseDealerAddress: values.purchaseDealerAddress.trim(),
    ...(normalizedPostalCode ? { postalCode: normalizedPostalCode } : {}),
    notes: values.notes.trim(),
    paintPairs,
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
        method: POST,
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
