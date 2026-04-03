import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type {
  ManualRegistrationApiResponse,
  ManualRegistrationFormValues,
  ManualRegistrationSubmissionResult,
} from '#/types/manualRegistration';
import env from '#env';
import { registrationsMockStore } from '../mockStore';

const shouldUseRegistrationMock = env.VITE_USE_MOCK_REGISTRATIONS !== false;

const appendIfPresent = (formData: FormData, key: string, value: string): void => {
  if (value.trim()) {
    formData.append(key, value.trim());
  }
};

const createManualRegistrationFormData = (values: ManualRegistrationFormValues): FormData => {
  const formData = new FormData();

  appendIfPresent(formData, 'customer_name', values.customerName);
  appendIfPresent(formData, 'phone_number', values.phoneNumber);
  appendIfPresent(formData, 'email', values.email);
  appendIfPresent(formData, 'city', values.city);
  appendIfPresent(formData, 'province', values.province);
  appendIfPresent(formData, 'site_address', values.siteAddress);
  appendIfPresent(formData, 'postal_code', values.postalCode);
  appendIfPresent(formData, 'purchase_date', values.purchaseDate);
  appendIfPresent(formData, 'purchase_dealer', values.purchaseDealer);
  appendIfPresent(formData, 'purchase_dealer_city', values.purchaseDealerCity);
  appendIfPresent(formData, 'purchase_dealer_address', values.purchaseDealerAddress);
  appendIfPresent(formData, 'notes', values.notes);
  appendIfPresent(formData, 'topcoat_product_name', values.topcoatProductName);
  appendIfPresent(formData, 'topcoat_quantity', values.topcoatQuantity);
  appendIfPresent(formData, 'basecoat_product_name', values.basecoatProductName);
  appendIfPresent(formData, 'basecoat_quantity', values.basecoatQuantity);

  if (values.topcoatInvoice) {
    formData.append('topcoat_invoice', values.topcoatInvoice);
  }

  if (values.basecoatInvoice) {
    formData.append('basecoat_invoice', values.basecoatInvoice);
  }

  formData.append('channel', 'WEBFORM');

  return formData;
};

const normalizeManualRegistrationResponse = (
  response: ManualRegistrationApiResponse
): ManualRegistrationSubmissionResult => {
  const id = response.id ?? response.registration?.id ?? 0;
  const registrationCode = response.registrationCode ?? response.registration?.registrationCode ?? '';

  return {
    id,
    registrationCode,
  };
};

const createManualRegistration = async (
  values: ManualRegistrationFormValues
): Promise<ManualRegistrationSubmissionResult> => {
  if (shouldUseRegistrationMock) {
    return registrationsMockStore.createManualRegistration(values);
  }

  const formData = createManualRegistrationFormData(values);

  const response = await performRequest<ManualRegistrationApiResponse, FormData>({
    method: 'post',
    url: apiEndpoints.registrations.createManual,
    payload: formData,
    config: {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  });

  return normalizeManualRegistrationResponse(response);
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
    mutationFn: createManualRegistration,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });
      if (data.id > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.registrations.detail(String(data.id)) });
      }
    },
  });
};
