import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys, REGISTRATION_ACTIONS, REGISTRATION_HTTP_METHODS } from '#/constants';
import { performRequest } from '#/services';
import type { RegistrationActionPayload } from '#/types/registrations';

interface RejectRegistrationVariables {
  id: string;
  notes: string;
  notificationTemplate: string;
}

/**
 * Sends reject action for a registration and refreshes related cache.
 *
 * @returns Registration reject mutation result.
 */
export const useRejectRegistrationMutation = (): UseMutationResult<void, Error, RejectRegistrationVariables> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, RejectRegistrationVariables>({
    mutationFn: async ({ id, notes, notificationTemplate }: RejectRegistrationVariables): Promise<void> => {
      const payload: RegistrationActionPayload = {
        action: REGISTRATION_ACTIONS.REJECT,
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
