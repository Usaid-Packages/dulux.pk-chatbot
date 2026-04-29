import { toast } from 'react-toastify';

import { getApiErrorMessage } from '#/utils';

interface MutationOptions<TData, TError> {
  onError: (error: TError) => void;
  onSuccess: (data: TData) => void;
}

type MutateFunction<TPayload, TData, TError> = (payload: TPayload, options: MutationOptions<TData, TError>) => void;

interface ExecuteMutationWithFeedbackParams<TPayload, TData, TError = Error> {
  mutate: MutateFunction<TPayload, TData, TError>;
  onSuccess?: (data: TData) => void;
  payload: TPayload;
  successMessage: string;
  showSuccessToast?: boolean;
}

/**
 * executeMutationWithFeedback runs a mutation with standardized success/error toast behavior.
 *
 * @param params - Mutation executor, payload, and toast metadata.
 */
export const executeMutationWithFeedback = <TPayload, TData, TError = Error>({
  mutate,
  onSuccess,
  payload,
  successMessage,
  showSuccessToast = true,
}: ExecuteMutationWithFeedbackParams<TPayload, TData, TError>): void => {
  mutate(payload, {
    onSuccess: data => {
      if (showSuccessToast) {
        toast.success(successMessage);
      }
      onSuccess?.(data);
    },
    onError: error => {
      toast.error(getApiErrorMessage(error));
    },
  });
};
