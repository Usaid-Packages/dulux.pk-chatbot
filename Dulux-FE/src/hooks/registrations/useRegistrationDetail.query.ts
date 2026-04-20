import {
  useApproveRegistrationMutation,
  useGetRegistrationByIdQuery,
  useRejectRegistrationMutation,
  useResubmitRegistrationMutation,
  useUpdateResubmitRegistrationMutation,
} from '#/data-layer/registrations';

export interface RegistrationDetailQueryState {
  detailQuery: ReturnType<typeof useGetRegistrationByIdQuery>;
  approveMutation: ReturnType<typeof useApproveRegistrationMutation>;
  rejectMutation: ReturnType<typeof useRejectRegistrationMutation>;
  resubmitMutation: ReturnType<typeof useResubmitRegistrationMutation>;
  updateResubmitMutation: ReturnType<typeof useUpdateResubmitRegistrationMutation>;
}

/**
 * Initializes registration detail query and mutation hooks used by the detail facade hook.
 *
 * @param registrationId - Registration identifier from route params.
 * @returns Query state and mutation instances for detail actions.
 */
export const useRegistrationDetailQueryState = (registrationId: string): RegistrationDetailQueryState => ({
  detailQuery: useGetRegistrationByIdQuery(registrationId),
  approveMutation: useApproveRegistrationMutation(),
  rejectMutation: useRejectRegistrationMutation(),
  resubmitMutation: useResubmitRegistrationMutation(),
  updateResubmitMutation: useUpdateResubmitRegistrationMutation(),
});
