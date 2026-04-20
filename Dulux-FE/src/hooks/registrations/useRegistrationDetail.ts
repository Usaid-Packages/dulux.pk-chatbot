import { toast } from 'react-toastify';

import {
  APPROVAL_TEMPLATE_FALLBACK_NOTE,
  REGISTRATION_DETAIL_UNAVAILABLE_MESSAGE,
  REJECTION_TEMPLATE_FALLBACK_NOTE,
  TOPCOAT_INVOICE_TYPE,
  TRIMMED_FIELD_MAPPINGS,
} from '#/constants';
import {
  useApproveRegistrationMutation,
  useGetRegistrationByIdQuery,
  useRejectRegistrationMutation,
  useResubmitRegistrationMutation,
  useUpdateResubmitRegistrationMutation,
} from '#/data-layer/registrations';
import { executeGuardedDetailMutation, executeMutationWithFeedback } from '#/hooks/common/detailActionController';
import type { ApproveFormValues, RejectFormValues, ResubmissionFormValues } from '#/schemas/registrations';
import type { ResubmitUpdateFormValues } from '#/schemas/registrations';
import type { RegistrationDetail, RegistrationResubmitUpdatePayload } from '#/types/registrations';
import type { ResubmissionFieldName } from '#/types/registrations';
import { createRegistrationApprovedTemplate, createRegistrationRejectedTemplate, getApiErrorMessage } from '#/utils';

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

  for (const mapping of TRIMMED_FIELD_MAPPINGS) {
    if (!requestedFieldNames.has(mapping.requestedFieldName)) {
      continue;
    }

    payload[mapping.payloadKey] = (values[mapping.valueKey] ?? '').trim();
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
    executeGuardedDetailMutation({
      detail: detailQuery.data,
      missingDetailMessage: REGISTRATION_DETAIL_UNAVAILABLE_MESSAGE,
      payload: values,
      buildPayload: (registration, formValues) => {
        const normalizedNotes = formValues.notes.trim();
        const templateNotes = normalizedNotes || APPROVAL_TEMPLATE_FALLBACK_NOTE;

        return {
          id: registrationId,
          notes: normalizedNotes,
          notificationTemplate: createRegistrationApprovedTemplate(registration, templateNotes),
        };
      },
      mutate: approveMutation.mutate,
      successMessage: 'Registration approved successfully.',
      onSuccess,
    });
  };

  const handleRejectRegistration = (values: RejectFormValues, onSuccess?: () => void): void => {
    executeGuardedDetailMutation({
      detail: detailQuery.data,
      missingDetailMessage: REGISTRATION_DETAIL_UNAVAILABLE_MESSAGE,
      payload: values,
      buildPayload: (registration, formValues) => {
        const normalizedNotes = formValues.notes.trim();
        const templateNotes = normalizedNotes || REJECTION_TEMPLATE_FALLBACK_NOTE;

        return {
          id: registrationId,
          notes: normalizedNotes,
          notificationTemplate: createRegistrationRejectedTemplate(registration, templateNotes),
        };
      },
      mutate: rejectMutation.mutate,
      successMessage: 'Registration rejected successfully.',
      onSuccess,
    });
  };

  const handleResubmitRegistration = (values: ResubmissionFormValues, onSuccess?: () => void): void => {
    const normalizedNotes = values.notes.trim();

    executeMutationWithFeedback({
      mutate: resubmitMutation.mutate,
      payload: {
        id: registrationId,
        fields: values.fields,
        notes: normalizedNotes,
      },
      successMessage: 'Resubmission request sent successfully.',
      onSuccess,
    });
  };

  const handleSubmitResubmitChanges = (values: ResubmitUpdateFormValues, onSuccess?: () => void): void => {
    const registration = detailQuery.data;
    if (!registration) {
      toast.error(REGISTRATION_DETAIL_UNAVAILABLE_MESSAGE);
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

    executeMutationWithFeedback({
      mutate: updateResubmitMutation.mutate,
      payload: {
        id: registrationId,
        payload,
        invoiceFiles: values.invoiceFiles,
      },
      successMessage: 'Resubmission fields updated successfully.',
      onSuccess,
    });
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
