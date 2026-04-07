import { toast } from 'react-toastify';

import {
  useApproveRegistrationMutation,
  useGetRegistrationByIdQuery,
  useRejectRegistrationMutation,
  useResubmitRegistrationMutation,
} from '#/data-layer/registrations';
import type { RejectFormValues, ResubmissionFormValues } from '#/schemas/registrations';
import type { RegistrationDetail } from '#/types/registrations';
import { getApiErrorMessage } from '#/utils';

export interface UseRegistrationDetailResult {
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  isApprovePending: boolean;
  isRejectPending: boolean;
  isResubmitPending: boolean;
  registrationId: string;
  registration?: RegistrationDetail;
  approveRegistration: () => void;
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

  const handleApproveRegistration = (): void => {
    approveMutation.mutate(
      { id: registrationId },
      {
        onSuccess: () => {
          toast.success('Registration approved successfully.');
        },
        onError: error => {
          toast.error(getApiErrorMessage(error));
        },
      }
    );
  };

  const handleRejectRegistration = (values: RejectFormValues, onSuccess?: () => void): void => {
    rejectMutation.mutate(
      {
        id: registrationId,
        reason: values.reason,
        notes: values.notes,
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
        note: values.note,
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
