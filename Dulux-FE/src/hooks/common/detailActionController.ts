import { toast } from 'react-toastify';

import { getApiErrorMessage } from '#/utils';

type MutationOptions = {
  onError: (error: Error) => void;
  onSuccess: () => void;
};

type MutateFunction<TPayload> = (payload: TPayload, options: MutationOptions) => void;

interface ExecuteMutationWithFeedbackParams<TPayload> {
  mutate: MutateFunction<TPayload>;
  onSuccess?: () => void;
  payload: TPayload;
  successMessage: string;
}

interface ExecuteGuardedDetailMutationParams<TDetail, TRawPayload, TPayload> {
  buildPayload: (detail: TDetail, payload: TRawPayload) => TPayload;
  detail: TDetail | undefined;
  missingDetailMessage: string;
  mutate: MutateFunction<TPayload>;
  onSuccess?: () => void;
  payload: TRawPayload;
  successMessage: string;
}

/**
 * executeMutationWithFeedback runs a mutation with standardized success/error toasts.
 *
 * @param params - Mutation executor, payload, and toast metadata.
 */
export const executeMutationWithFeedback = <TPayload>({
  mutate,
  onSuccess,
  payload,
  successMessage,
}: ExecuteMutationWithFeedbackParams<TPayload>): void => {
  mutate(payload, {
    onSuccess: () => {
      toast.success(successMessage);
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
};

/**
 * executeGuardedDetailMutation validates detail presence, builds payload, and executes mutation with feedback.
 *
 * @param params - Detail guard metadata, payload builder, and mutation executor.
 */
export const executeGuardedDetailMutation = <TDetail, TRawPayload, TPayload>({
  buildPayload,
  detail,
  missingDetailMessage,
  mutate,
  onSuccess,
  payload,
  successMessage,
}: ExecuteGuardedDetailMutationParams<TDetail, TRawPayload, TPayload>): void => {
  if (!detail) {
    toast.error(missingDetailMessage);
    return;
  }

  let resolvedPayload: TPayload;
  try {
    resolvedPayload = buildPayload(detail, payload);
  } catch (error) {
    toast.error(getApiErrorMessage(error));
    return;
  }

  executeMutationWithFeedback({
    mutate,
    onSuccess,
    payload: resolvedPayload,
    successMessage,
  });
};
