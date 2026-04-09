import { GET, apiEndpoints } from '#/constants';
import { registrationCardCountsSchema } from '#/schemas/registrations';
import { performRequest } from '#/services';
import type { RegistrationCardCounts } from '#/types/registrations';

export const getRegistrationCardCounts = async (): Promise<RegistrationCardCounts> => {
  const response = await performRequest<RegistrationCardCounts>({
    method: GET,
    url: apiEndpoints.registrations.cardCounts,
  });

  return registrationCardCountsSchema.parse(response);
};
