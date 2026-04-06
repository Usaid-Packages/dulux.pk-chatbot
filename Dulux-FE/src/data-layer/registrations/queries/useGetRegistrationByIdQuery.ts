import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { RegistrationDetail, RegistrationDetailApiResponse } from '#/types/registrations';
import { normalizeRegistrationDetailResponse } from '#/utils';

/**
 * Fetches a single registration detail by id.
 *
 * @param id - Registration id from route params.
 * @returns React Query result for the registration detail payload.
 */
export const useGetRegistrationByIdQuery = (id: string): UseQueryResult<RegistrationDetail, Error> => {
  return useQuery<RegistrationDetail, Error>({
    queryKey: queryKeys.registrations.detail(id),
    queryFn: async (): Promise<RegistrationDetail> => {
      const response = await performRequest<RegistrationDetailApiResponse>({
        method: 'get',
        url: apiEndpoints.registrations.detail(id),
      });

      return normalizeRegistrationDetailResponse(response);
    },
    enabled: Boolean(id),
  });
};
