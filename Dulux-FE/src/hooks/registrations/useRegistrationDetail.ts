import type { ApproveFormValues, RejectFormValues, ResubmissionFormValues } from '#/schemas/registrations';
import type { ResubmitUpdateFormValues } from '#/schemas/registrations';
import type { RegistrationDetail } from '#/types/registrations';
import { createRegistrationDetailActions } from './useRegistrationDetail.actions';
import { useRegistrationDetailQueryState } from './useRegistrationDetail.query';

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
  const { detailQuery, approveMutation, rejectMutation, resubmitMutation, updateResubmitMutation } =
    useRegistrationDetailQueryState(registrationId);

  const { approveRegistration, rejectRegistration, resubmitRegistration, submitResubmitChanges } =
    createRegistrationDetailActions({
      registrationId,
      registration: detailQuery.data,
      approveMutate: approveMutation.mutate,
      rejectMutate: rejectMutation.mutate,
      resubmitMutate: resubmitMutation.mutate,
      updateResubmitMutate: updateResubmitMutation.mutate,
    });

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
    approveRegistration,
    rejectRegistration,
    resubmitRegistration,
    submitResubmitChanges,
  };
};
