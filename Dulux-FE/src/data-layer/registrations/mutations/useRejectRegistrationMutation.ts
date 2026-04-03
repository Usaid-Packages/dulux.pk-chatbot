import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { RegistrationActionPayload } from '#/types/registrations';
import env from '#env';
import { registrationsMockStore } from '../mockStore';

interface RejectRegistrationVariables {
  id: string;
  reason: string;
  notes: string;
}

const shouldUseRegistrationMock = env.VITE_USE_MOCK_REGISTRATIONS !== false;

const rejectRegistration = async ({ id, reason, notes }: RejectRegistrationVariables): Promise<void> => {
  const payload: RegistrationActionPayload = {
    action: 'REJECT',
    notes,
    rejectionFields: [
      {
        fieldName: reason,
        note: notes,
      },
    ],
  };

  if (shouldUseRegistrationMock) {
    await registrationsMockStore.applyRegistrationAction(id, payload);
    return;
  }

  await performRequest<void, RegistrationActionPayload>({
    method: 'patch',
    url: apiEndpoints.registrations.detail(id),
    payload,
  });
};

/**
 * Sends reject action for a registration and refreshes related cache.
 *
 * @returns Registration reject mutation result.
 */
export const useRejectRegistrationMutation = (): UseMutationResult<void, Error, RejectRegistrationVariables> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, RejectRegistrationVariables>({
    mutationFn: rejectRegistration,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.detail(variables.id) });
    },
  });
};
