import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { RegistrationActionPayload } from '#/types/registrations';
import env from '#env';
import { registrationsMockStore } from '../mockStore';

interface ApproveRegistrationVariables {
  id: string;
}

const shouldUseRegistrationMock = env.VITE_USE_MOCK_REGISTRATIONS !== false;

const approveRegistration = async ({ id }: ApproveRegistrationVariables): Promise<void> => {
  const payload: RegistrationActionPayload = {
    action: 'APPROVE',
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
 * Sends approve action for a registration and refreshes related cache.
 *
 * @returns Registration approve mutation result.
 */
export const useApproveRegistrationMutation = (): UseMutationResult<void, Error, ApproveRegistrationVariables> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ApproveRegistrationVariables>({
    mutationFn: approveRegistration,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.detail(variables.id) });
    },
  });
};
