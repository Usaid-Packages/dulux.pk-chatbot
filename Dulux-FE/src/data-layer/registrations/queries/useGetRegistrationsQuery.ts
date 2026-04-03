import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { RegistrationListItem, RegistrationsListResponse, RegistrationsQueryParams } from '#/types/registrations';
import env from '#env';
import { registrationsMockStore } from '../mockStore';

interface RegistrationsApiResponse extends Partial<RegistrationsListResponse> {
  results?: RegistrationListItem[];
}

const STALE_TIME_FIVE_MINUTES = 5 * 60 * 1000;
const shouldUseRegistrationMock = env.VITE_USE_MOCK_REGISTRATIONS !== false;

const serializeRegistrationsParams = (params?: RegistrationsQueryParams): string => {
  if (!params) {
    return '{}';
  }

  const orderedEntries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey));

  return JSON.stringify(Object.fromEntries(orderedEntries));
};

const normalizeRegistrationsResponse = (response: RegistrationsApiResponse): RegistrationsListResponse => {
  return {
    count: response.count ?? response.results?.length ?? 0,
    next: response.next ?? null,
    previous: response.previous ?? null,
    results: response.results ?? [],
  };
};

const fetchRegistrations = async (params?: RegistrationsQueryParams): Promise<RegistrationsListResponse> => {
  if (shouldUseRegistrationMock) {
    return registrationsMockStore.fetchRegistrations(params) as Promise<RegistrationsListResponse>;
  }

  const response = await performRequest<RegistrationsApiResponse, undefined, RegistrationsQueryParams>({
    method: 'get',
    url: apiEndpoints.registrations.list,
    params,
  });

  return normalizeRegistrationsResponse(response);
};

/**
 * Fetches the registration list with optional search/status/date filters.
 *
 * @param params - List query params.
 * @returns React Query result for registrations list.
 */
export const useGetRegistrationsQuery = (
  params?: RegistrationsQueryParams
): UseQueryResult<RegistrationsListResponse, Error> => {
  const paramsKey = serializeRegistrationsParams(params);

  return useQuery<RegistrationsListResponse, Error>({
    queryKey: queryKeys.registrations.list(paramsKey),
    queryFn: (): Promise<RegistrationsListResponse> => fetchRegistrations(params),
    staleTime: STALE_TIME_FIVE_MINUTES,
  });
};
