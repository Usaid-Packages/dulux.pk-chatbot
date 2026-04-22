import { toast } from 'react-toastify';

import { executeMutationWithFeedback } from '#/hooks/common/mutationFeedback';
import { getApiErrorMessage } from '#/utils';

type MutationOptions = {
  onError: (error: Error) => void;
  onSuccess: () => void;
};

type MutateFunction<TPayload> = (payload: TPayload, options: MutationOptions) => void;

export { executeMutationWithFeedback };

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
