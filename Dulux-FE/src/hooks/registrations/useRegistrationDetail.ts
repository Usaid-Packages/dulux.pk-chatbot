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

    approveMutation.mutate(
      {
        id: registrationId,
        notes: values.notes,
        notificationTemplate: createRegistrationApprovedTemplate(registration, values.notes),
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

    rejectMutation.mutate(
      {
        id: registrationId,
        notes: values.notes,
        notificationTemplate: createRegistrationRejectedTemplate(registration, values.notes),
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
    resubmitMutation.mutate(
      {
        id: registrationId,
        fields: values.fields,
        notes: values.notes,
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
