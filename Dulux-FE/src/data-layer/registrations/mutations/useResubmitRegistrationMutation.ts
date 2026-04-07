import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys, REGISTRATION_ACTIONS, REGISTRATION_HTTP_METHODS } from '#/constants';
import { performRequest } from '#/services';
import type { RegistrationActionPayload } from '#/types/registrations';

interface ResubmitRegistrationVariables {
  id: string;
  fields: string[];
  note?: string;
}

/**
 * Sends resubmission request for selected fields and refreshes related cache.
 *
 * @returns Registration resubmission mutation result.
 */
export const useResubmitRegistrationMutation = (): UseMutationResult<void, Error, ResubmitRegistrationVariables> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ResubmitRegistrationVariables>({
    mutationFn: async ({ id, fields, note }: ResubmitRegistrationVariables): Promise<void> => {
      const payload: RegistrationActionPayload = {
        action: REGISTRATION_ACTIONS.RESUBMIT,
        notes: note,
        rejectionFields: fields.map(fieldName => ({
          fieldName,
          note,
        })),
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
