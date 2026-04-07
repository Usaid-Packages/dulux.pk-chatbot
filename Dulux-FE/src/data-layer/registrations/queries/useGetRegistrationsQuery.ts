import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { RegistrationsListResponse, RegistrationsQueryParams } from '#/types/registrations';
import { normalizeRegistrationsListResponse } from '#/utils';

const STALE_TIME_FIVE_MINUTES = 5 * 60 * 1000;

const serializeRegistrationsParams = (params?: RegistrationsQueryParams): string => {
  if (!params) {
    return '{}';
  }

  const orderedEntries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey));

  return JSON.stringify(Object.fromEntries(orderedEntries));
};

/**
 * Fetches the registration list with optional API-supported filters.
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
    queryFn: async (): Promise<RegistrationsListResponse> => {
      const response = await performRequest<Partial<RegistrationsListResponse>, undefined, RegistrationsQueryParams>({
        method: 'get',
        url: apiEndpoints.registrations.list,
        params,
      });

      return normalizeRegistrationsListResponse(response);
    },
    staleTime: STALE_TIME_FIVE_MINUTES,
  });
};
