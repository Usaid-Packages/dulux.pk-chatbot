import { toast } from 'react-toastify';

import {
  useApproveRegistrationMutation,
  useGetRegistrationByIdQuery,
  useRejectRegistrationMutation,
  useResubmitRegistrationMutation,
} from '#/data-layer/registrations';
import type { ApproveFormValues, RejectFormValues, ResubmissionFormValues } from '#/schemas/registrations';
import type { RegistrationDetail } from '#/types/registrations';
import { createRegistrationApprovedTemplate, createRegistrationRejectedTemplate, getApiErrorMessage } from '#/utils';

const APPROVAL_TEMPLATE_FALLBACK_NOTE = 'Approval confirmed.';
const REJECTION_TEMPLATE_FALLBACK_NOTE = 'Rejected after review.';

export interface UseRegistrationDetailResult {
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  isApprovePending: boolean;
  isRejectPending: boolean;
  isResubmitPending: boolean;
  registrationId: string;
  registration?: RegistrationDetail;
  approveRegistration: (values: ApproveFormValues, onSuccess?: () => void) => void;
  rejectRegistration: (values: RejectFormValues, onSuccess?: () => void) => void;
  resubmitRegistration: (values: ResubmissionFormValues, onSuccess?: () => void) => void;
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

  return {
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    errorMessage: detailQuery.error?.message ?? 'Unable to load registration detail.',
    isApprovePending: approveMutation.isPending,
    isRejectPending: rejectMutation.isPending,
    isResubmitPending: resubmitMutation.isPending,
    registrationId,
    registration: detailQuery.data,
    approveRegistration: handleApproveRegistration,
    rejectRegistration: handleRejectRegistration,
    resubmitRegistration: handleResubmitRegistration,
  };
};
