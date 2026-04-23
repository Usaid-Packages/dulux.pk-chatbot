import { toast } from 'react-toastify';

import { REGISTRATION_DETAIL_UNAVAILABLE_MESSAGE, REGISTRATION_MESSAGES } from '#/constants';
import { executeGuardedDetailMutation, executeMutationWithFeedback } from '#/hooks/common/detailActionController';
import type {
  ApproveFormValues,
  RejectFormValues,
  ResubmissionFormValues,
  ResubmitUpdateFormValues,
} from '#/schemas/registrations';
import type { RegistrationDetail, RegistrationResubmitUpdatePayload } from '#/types/registrations';
import { getApiErrorMessage } from '#/utils';
import {
  buildApproveRegistrationMutationPayload,
  buildRejectRegistrationMutationPayload,
  buildResubmitRegistrationMutationPayload,
  buildResubmitUpdatePayload,
  type ApproveRegistrationMutationPayload,
  type RejectRegistrationMutationPayload,
  type ResubmitRegistrationMutationPayload,
  type UpdateResubmitRegistrationMutationPayload,
} from './useRegistrationDetail.payloadBuilder';

interface MutationOptions {
  onError: (error: Error) => void;
  onSuccess: () => void;
}

type MutateFunction<TPayload> = (payload: TPayload, options: MutationOptions) => void;

interface CreateRegistrationDetailActionsParams {
  registrationId: string;
  registration: RegistrationDetail | undefined;
  approveMutate: MutateFunction<ApproveRegistrationMutationPayload>;
  rejectMutate: MutateFunction<RejectRegistrationMutationPayload>;
  resubmitMutate: MutateFunction<ResubmitRegistrationMutationPayload>;
  updateResubmitMutate: MutateFunction<UpdateResubmitRegistrationMutationPayload>;
}

interface RegistrationDetailActions {
  approveRegistration: (values: ApproveFormValues, onSuccess?: () => void) => void;
  rejectRegistration: (values: RejectFormValues, onSuccess?: () => void) => void;
  resubmitRegistration: (values: ResubmissionFormValues, onSuccess?: () => void) => void;
  submitResubmitChanges: (values: ResubmitUpdateFormValues, onSuccess?: () => void) => void;
}

/**
 * Creates registration detail action handlers separated from query orchestration.
 *
 * @param params - Detail state, registration id and mutation executors.
 * @returns Action handlers for approve/reject/resubmit flows.
 */
export const createRegistrationDetailActions = ({
  registrationId,
  registration,
  approveMutate,
  rejectMutate,
  resubmitMutate,
  updateResubmitMutate,
}: CreateRegistrationDetailActionsParams): RegistrationDetailActions => {
  const approveRegistration = (values: ApproveFormValues, onSuccess?: () => void): void => {
    executeGuardedDetailMutation({
      detail: registration,
      missingDetailMessage: REGISTRATION_DETAIL_UNAVAILABLE_MESSAGE,
      payload: values,
      buildPayload: (detail, formValues) => buildApproveRegistrationMutationPayload(registrationId, detail, formValues),
      mutate: approveMutate,
      successMessage: REGISTRATION_MESSAGES.APPROVED_SUCCESS,
      onSuccess,
    });
  };

  const rejectRegistration = (values: RejectFormValues, onSuccess?: () => void): void => {
    executeGuardedDetailMutation({
      detail: registration,
      missingDetailMessage: REGISTRATION_DETAIL_UNAVAILABLE_MESSAGE,
      payload: values,
      buildPayload: (detail, formValues) => buildRejectRegistrationMutationPayload(registrationId, detail, formValues),
      mutate: rejectMutate,
      successMessage: REGISTRATION_MESSAGES.REJECTED_SUCCESS,
      onSuccess,
    });
  };

  const resubmitRegistration = (values: ResubmissionFormValues, onSuccess?: () => void): void => {
    executeMutationWithFeedback({
      mutate: resubmitMutate,
      payload: buildResubmitRegistrationMutationPayload(registrationId, values),
      successMessage: REGISTRATION_MESSAGES.RESUBMISSION_REQUEST_SENT,
      onSuccess,
    });
  };

  const submitResubmitChanges = (values: ResubmitUpdateFormValues, onSuccess?: () => void): void => {
    if (!registration) {
      toast.error(REGISTRATION_DETAIL_UNAVAILABLE_MESSAGE);
      return;
    }

    if (registration.state !== 'RESUBMIT') {
      toast.error(REGISTRATION_MESSAGES.RESUBMISSION_STATE_REQUIRED);
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
      mutate: updateResubmitMutate,
      payload: {
        id: registrationId,
        payload,
        invoiceFiles: values.invoiceFiles,
      },
      successMessage: REGISTRATION_MESSAGES.RESUBMISSION_FIELDS_UPDATED,
      onSuccess,
    });
  };

  return {
    approveRegistration,
    rejectRegistration,
    resubmitRegistration,
    submitResubmitChanges,
  };
};
