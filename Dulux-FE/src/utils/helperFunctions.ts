/**
 * Helper Functions - add implementations as needed.
 *
 * Each block below describes the intended helper function, its parameters,
 * return value, example usage, and complexity notes. Keep implementations
 * small, well-tested, and documented.
 */

/**
 * formatDate
 * - Purpose: Format a Date to a localized string or custom format.
 * - Params:
 *   - date: Date | string | number
 *   - options?: { locale?: string; timeZone?: string; options?: Intl.DateTimeFormatOptions }
 * - Returns: formatted string
 * - Example: formatDate(new Date(), { locale: 'en-US' })
 * - Complexity: O(1)
 */

import { DEFAULT_API_ERROR_MESSAGE } from '#/constants';
import type { ApiErrorShape } from '#/types/common/error.types';
import type {
  ManualRegistrationApiResponse,
  ManualRegistrationSubmissionResult,
} from '#/types/manualRegistration/manualRegistration.types';
import type {
  RegistrationDetail,
  RegistrationDetailApiResponse,
  RegistrationsListResponse,
} from '#/types/registrations/registration.types';
import type { Paginated } from '#/types/services.types';

export const getApiErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') {
    return DEFAULT_API_ERROR_MESSAGE;
  }

  const typedError = error as ApiErrorShape;
  return (
    typedError.response?.data?.message ??
    typedError.response?.data?.detail ??
    typedError.message ??
    DEFAULT_API_ERROR_MESSAGE
  );
};

export function getNextPageParamHelper<TData>(lastPage: TData, allPages: TData[], limit: number): number | undefined {
  if (Array.isArray(lastPage)) {
    return lastPage.length === limit ? allPages.length + 1 : undefined;
  }

  if (lastPage && typeof lastPage === 'object') {
    const pageObj = lastPage as Paginated;
    const data = pageObj.data ?? pageObj.items ?? pageObj.results;

    const hasNext =
      pageObj.hasNext !== undefined
        ? pageObj.hasNext
        : pageObj.total !== undefined
          ? allPages.length * limit < pageObj.total
          : Array.isArray(data) && data.length === limit;

    return hasNext ? allPages.length + 1 : undefined;
  }

  return undefined;
}

export const normalizeRegistrationsListResponse = (
  response: Partial<RegistrationsListResponse>
): RegistrationsListResponse => {
  return {
    count: response.count ?? response.results?.length ?? 0,
    next: response.next ?? null,
    previous: response.previous ?? null,
    results: response.results ?? [],
  };
};

export const normalizeRegistrationDetailResponse = (response: RegistrationDetailApiResponse): RegistrationDetail => {
  const normalizedPaintPairs = (response.paintPairs ?? []).map(pair => {
    return {
      id: pair.id ?? 0,
      topcoat: {
        id: pair.topcoat ?? 0,
        name: pair.topcoatName ?? '',
        productType: 'TOPCOAT',
      },
      topcoatQuantity: pair.topcoatQuantity ?? '',
      basecoat:
        pair.basecoat === null || pair.basecoat === undefined
          ? null
          : {
              id: pair.basecoat,
              name: pair.basecoatName ?? '',
              productType: 'BASECOAT',
            },
      basecoatQuantity: pair.basecoatQuantity ?? null,
    };
  });

  const normalizedInvoices = (response.paintPairInvoices ?? []).map(invoice => {
    return {
      id: invoice.id ?? 0,
      image: {
        id: invoice.image?.id ?? 0,
        image: invoice.image?.image ?? '',
      },
      invoiceType: invoice.invoiceType ?? 'TOPCOAT',
    };
  });

  return {
    id: response.id ?? 0,
    registrationCode: response.registrationCode ?? response.registrationNumber ?? '',
    channel: response.channel ?? 'WEBFORM',
    state: response.state ?? 'SUBMITTED',
    customerName: response.customerName ?? '',
    phoneNumber: response.phoneNumber ?? '',
    email: response.email ?? '',
    city: response.city ?? '',
    province: response.province ?? '',
    siteAddress: response.siteAddress ?? '',
    purchaseDate: response.purchaseDate ?? '',
    purchaseDealer: response.purchaseDealer ?? '',
    purchaseDealerCity: response.purchaseDealerCity ?? '',
    purchaseDealerAddress: response.purchaseDealerAddress ?? '',
    postalCode: response.postalCode ?? '',
    notes: response.notes ?? '',
    approvedBy: response.approvedBy ?? null,
    approvedByEmail: response.approvedByEmail ?? null,
    approvedAt: response.approvedAt ?? null,
    warrantyCertificate: response.warrantyCertificate ?? null,
    paintPairs: normalizedPaintPairs,
    paintPairInvoices: normalizedInvoices,
    created: response.created ?? '',
    modified: response.modified ?? response.created ?? '',
  };
};

export const normalizeManualRegistrationCreateResponse = (
  response: ManualRegistrationApiResponse
): ManualRegistrationSubmissionResult => {
  const id = response.id ?? response.registration?.id ?? 0;
  const registrationCode =
    response.registrationCode ?? response.registration?.registrationCode ?? response.registrationNumber ?? '';

  return {
    id,
    registrationCode,
  };
};
