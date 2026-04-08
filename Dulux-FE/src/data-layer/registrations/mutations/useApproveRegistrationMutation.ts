import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys, REGISTRATION_ACTIONS, REGISTRATION_HTTP_METHODS } from '#/constants';
import { performRequest } from '#/services';
import type { RegistrationActionPayload } from '#/types/registrations';

interface ApproveRegistrationVariables {
  id: string;
  notes: string;
  notificationTemplate: string;
}

/**
 * Sends approve action for a registration and refreshes related cache.
 *
 * @returns Registration approve mutation result.
 */
export const useApproveRegistrationMutation = (): UseMutationResult<void, Error, ApproveRegistrationVariables> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ApproveRegistrationVariables>({
    mutationFn: async ({ id, notes, notificationTemplate }: ApproveRegistrationVariables): Promise<void> => {
      const payload: RegistrationActionPayload = {
        action: REGISTRATION_ACTIONS.APPROVE,
        notes,
        notificationTemplate,
      };

      await performRequest<void, RegistrationActionPayload>({
        method: REGISTRATION_HTTP_METHODS.PATCH,
        url: apiEndpoints.registrations.detail(id),
        payload,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.detail(variables.id) });
    },
  });
};
