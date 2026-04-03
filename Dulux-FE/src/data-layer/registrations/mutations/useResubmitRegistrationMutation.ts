import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { RegistrationActionPayload } from '#/types/registrations';
import env from '#env';
import { registrationsMockStore } from '../mockStore';

interface ResubmitRegistrationVariables {
  id: string;
  fields: string[];
  note?: string;
}

const shouldUseRegistrationMock = env.VITE_USE_MOCK_REGISTRATIONS !== false;

const resubmitRegistration = async ({ id, fields, note }: ResubmitRegistrationVariables): Promise<void> => {
  const payload: RegistrationActionPayload = {
    action: 'RESUBMIT',
    notes: note,
    rejectionFields: fields.map(fieldName => ({
      fieldName,
      note,
    })),
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
 * Sends resubmission request for selected fields and refreshes related cache.
 *
 * @returns Registration resubmission mutation result.
 */
export const useResubmitRegistrationMutation = (): UseMutationResult<void, Error, ResubmitRegistrationVariables> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ResubmitRegistrationVariables>({
    mutationFn: resubmitRegistration,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.detail(variables.id) });
    },
  });
};
