import { toast } from 'react-toastify';

import { REGISTRATION_INVOICE_TYPES } from '#/constants';
import {
  useApproveRegistrationMutation,
  useGetRegistrationByIdQuery,
  useRejectRegistrationMutation,
  useResubmitRegistrationMutation,
  useUpdateResubmitRegistrationMutation,
} from '#/data-layer/registrations';
import type { ApproveFormValues, RejectFormValues, ResubmissionFormValues } from '#/schemas/registrations';
import type { ResubmitUpdateFormValues } from '#/schemas/registrations';
import type { RegistrationDetail, RegistrationResubmitUpdatePayload } from '#/types/registrations';
import type { ResubmissionFieldName } from '#/types/registrations';
import { createRegistrationApprovedTemplate, createRegistrationRejectedTemplate, getApiErrorMessage } from '#/utils';

const APPROVAL_TEMPLATE_FALLBACK_NOTE = 'Approval confirmed.';
const REJECTION_TEMPLATE_FALLBACK_NOTE = 'Rejected after review.';
const TOPCOAT_INVOICE_TYPE = REGISTRATION_INVOICE_TYPES.TOPCOAT;

const toIntegerOrNull = (value: string): number | null => {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number.parseInt(normalizedValue, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const buildResubmitUpdatePayload = (
  registration: RegistrationDetail,
  values: ResubmitUpdateFormValues
): RegistrationResubmitUpdatePayload => {
  const payload: RegistrationResubmitUpdatePayload = {};
  const requestedFieldNames = new Set<ResubmissionFieldName>(
    registration.rejectionFields.map(field => field.fieldName)
  );

  if (requestedFieldNames.has('customer_name')) {
    payload.customerName = (values.customerName ?? '').trim();
  }

  if (requestedFieldNames.has('phone_number')) {
    payload.phoneNumber = (values.phoneNumber ?? '').trim();
  }

  if (requestedFieldNames.has('email')) {
    payload.email = (values.email ?? '').trim();
  }

  if (requestedFieldNames.has('city')) {
    payload.city = (values.city ?? '').trim();
  }

  if (requestedFieldNames.has('site_address')) {
    payload.siteAddress = (values.siteAddress ?? '').trim();
  }

  if (requestedFieldNames.has('purchase_date')) {
    payload.purchaseDate = (values.purchaseDate ?? '').trim();
  }

  if (requestedFieldNames.has('purchase_dealer')) {
    payload.purchaseDealer = (values.purchaseDealer ?? '').trim();
  }

  if (requestedFieldNames.has('purchase_dealer_city')) {
    payload.purchaseDealerCity = (values.purchaseDealerCity ?? '').trim();
  }

  if (requestedFieldNames.has('purchase_dealer_address')) {
    payload.purchaseDealerAddress = (values.purchaseDealerAddress ?? '').trim();
  }

  if (requestedFieldNames.has('postal_code')) {
    payload.postalCode = (values.postalCode ?? '').trim();
  }

  if (requestedFieldNames.has('paint_pairs')) {
    payload.paintPairs = values.paintPairs.map(paintPair => {
      const topcoat = toIntegerOrNull(paintPair.topcoatId);
      if (!topcoat) {
        throw new Error('Topcoat product is required for every paint pair.');
      }

      const basecoat = toIntegerOrNull(paintPair.basecoatId);

      return {
        topcoat,
        topcoatQuantity: paintPair.topcoatQuantity.trim(),
        ...(basecoat ? { basecoat } : {}),
        ...(paintPair.basecoatQuantity.trim() ? { basecoatQuantity: paintPair.basecoatQuantity.trim() } : {}),
      };
    });
  }

  if (requestedFieldNames.has('paint_pair_invoices')) {
    payload.paintPairInvoices = registration.paintPairInvoices.map(invoice => ({
      imageId: invoice.image.id,
      invoiceType: invoice.invoiceType || TOPCOAT_INVOICE_TYPE,
    }));
  }

  return payload;
};

export interface UseRegistrationDetailResult {
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  isApprovePending: boolean;
  isRejectPending: boolean;
  isResubmitPending: boolean;
  isResubmitUpdatePending: boolean;
  registrationId: string;
  registration?: RegistrationDetail;
  approveRegistration: (values: ApproveFormValues, onSuccess?: () => void) => void;
  rejectRegistration: (values: RejectFormValues, onSuccess?: () => void) => void;
  resubmitRegistration: (values: ResubmissionFormValues, onSuccess?: () => void) => void;
  submitResubmitChanges: (values: ResubmitUpdateFormValues, onSuccess?: () => void) => void;
}

/**
 * Provides registration-detail query and action mutations.
 *
 * @param registrationId - Registration id from route params.
 * @returns Detail state and action handlers.
 */
export const useRegistrationDetail = (registrationId: string): UseRegistrationDetailResult => {
  const detailQuery = useGetRegistrationByIdQuery(registrationId);
  const approveMutation = useApproveRegistrationMutation();
  const rejectMutation = useRejectRegistrationMutation();
  const resubmitMutation = useResubmitRegistrationMutation();
  const updateResubmitMutation = useUpdateResubmitRegistrationMutation();

  const handleApproveRegistration = (values: ApproveFormValues, onSuccess?: () => void): void => {
    const registration = detailQuery.data;
    if (!registration) {
      toast.error('Registration detail is not available.');
      return;
    }

    const normalizedNotes = values.notes.trim();
    const templateNotes = normalizedNotes || APPROVAL_TEMPLATE_FALLBACK_NOTE;

    approveMutation.mutate(
      {
        id: registrationId,
        notes: normalizedNotes,
        notificationTemplate: createRegistrationApprovedTemplate(registration, templateNotes),
      },
      {
        onSuccess: () => {
          toast.success('Registration approved successfully.');
          if (onSuccess) {
            onSuccess();
          }
        },
        onError: error => {
          toast.error(getApiErrorMessage(error));
        },
      }
    );
  };

  const handleRejectRegistration = (values: RejectFormValues, onSuccess?: () => void): void => {
    const registration = detailQuery.data;
    if (!registration) {
      toast.error('Registration detail is not available.');
      return;
    }

    const normalizedNotes = values.notes.trim();
    const templateNotes = normalizedNotes || REJECTION_TEMPLATE_FALLBACK_NOTE;

    rejectMutation.mutate(
      {
        id: registrationId,
        notes: normalizedNotes,
        notificationTemplate: createRegistrationRejectedTemplate(registration, templateNotes),
      },
      {
        onSuccess: () => {
          toast.success('Registration rejected successfully.');
          if (onSuccess) {
            onSuccess();
          }
        },
        onError: error => {
          toast.error(getApiErrorMessage(error));
        },
      }
    );
  };

  const handleResubmitRegistration = (values: ResubmissionFormValues, onSuccess?: () => void): void => {
    const normalizedNotes = values.notes.trim();

    resubmitMutation.mutate(
      {
        id: registrationId,
        fields: values.fields,
        notes: normalizedNotes,
      },
      {
        onSuccess: () => {
          toast.success('Resubmission request sent successfully.');
          if (onSuccess) {
            onSuccess();
          }
        },
        onError: error => {
          toast.error(getApiErrorMessage(error));
        },
      }
    );
  };

  const handleSubmitResubmitChanges = (values: ResubmitUpdateFormValues, onSuccess?: () => void): void => {
    const registration = detailQuery.data;
    if (!registration) {
      toast.error('Registration detail is not available.');
      return;
    }

    if (registration.state !== 'RESUBMIT') {
      toast.error('Registration fields can only be updated in RESUBMIT state.');
      return;
    }

    let payload: RegistrationResubmitUpdatePayload;
    try {
      payload = buildResubmitUpdatePayload(registration, values);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      return;
    }

    updateResubmitMutation.mutate(
      {
        id: registrationId,
        payload,
        invoiceFiles: values.invoiceFiles,
      },
      {
        onSuccess: () => {
          toast.success('Resubmission fields updated successfully.');
          if (onSuccess) {
            onSuccess();
          }
        },
        onError: error => {
          toast.error(getApiErrorMessage(error));
        },
      }
    );
  };

  return {
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    errorMessage: detailQuery.error?.message ?? 'Unable to load registration detail.',
    isApprovePending: approveMutation.isPending,
    isRejectPending: rejectMutation.isPending,
    isResubmitPending: resubmitMutation.isPending,
    isResubmitUpdatePending: updateResubmitMutation.isPending,
    registrationId,
    registration: detailQuery.data,
    approveRegistration: handleApproveRegistration,
    rejectRegistration: handleRejectRegistration,
    resubmitRegistration: handleResubmitRegistration,
    submitResubmitChanges: handleSubmitResubmitChanges,
  };
};
