import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { RegistrationDetail } from '#/types/registrations';
import env from '#env';
import { registrationsMockStore } from '../mockStore';

const shouldUseRegistrationMock = env.VITE_USE_MOCK_REGISTRATIONS !== false;

const fetchRegistrationById = async (id: string): Promise<RegistrationDetail> => {
  if (shouldUseRegistrationMock) {
    return registrationsMockStore.fetchRegistrationById(id) as Promise<RegistrationDetail>;
  }

  return performRequest<RegistrationDetail>({
    method: 'get',
    url: apiEndpoints.registrations.detail(id),
  });
};

/**
 * Fetches a single registration detail by id.
 *
 * @param id - Registration id from route params.
 * @returns React Query result for the registration detail payload.
 */
export const useGetRegistrationByIdQuery = (id: string): UseQueryResult<RegistrationDetail, Error> => {
  return useQuery<RegistrationDetail, Error>({
    queryKey: queryKeys.registrations.detail(id),
    queryFn: (): Promise<RegistrationDetail> => fetchRegistrationById(id),
    enabled: Boolean(id),
  });
};
