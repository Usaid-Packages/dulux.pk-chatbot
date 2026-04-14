import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import axios from 'axios';

import { apiEndpoints, GET, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { SurfaceTypeListResponse, SurfaceTypeQueryParams } from '#/types/products';
import { normalizeSurfaceTypesResponse, serializeSurfaceTypeParams } from './shared';
import type { PaginatedApiResponse, SurfaceTypeApiResponse } from './shared';

const STALE_TIME_FIVE_MINUTES = 5 * 60 * 1000;
const FIRST_PAGE = 1;
const INVALID_PAGE_ERROR_DETAIL = 'Invalid page.';

interface ApiErrorWithDetail {
  detail?: string;
}

const isInvalidPageError = (error: unknown): boolean => {
  if (!axios.isAxiosError<ApiErrorWithDetail>(error)) {
    return false;
  }

  return error.response?.status === 404 && error.response.data?.detail === INVALID_PAGE_ERROR_DETAIL;
};

const fetchSurfaceTypes = async (params?: SurfaceTypeQueryParams): Promise<SurfaceTypeListResponse> => {
  const requestedPage = params?.page ?? FIRST_PAGE;
  let fallbackPage = requestedPage;

  while (fallbackPage >= FIRST_PAGE) {
    try {
      const response = await performRequest<
        PaginatedApiResponse<SurfaceTypeApiResponse>,
        undefined,
        SurfaceTypeQueryParams
      >({
        method: GET,
        url: apiEndpoints.products.surfaceTypes,
        params: {
          ...(params ?? {}),
          page: fallbackPage,
        },
      });

      return normalizeSurfaceTypesResponse(response);
    } catch (error: unknown) {
      if (!isInvalidPageError(error) || fallbackPage === FIRST_PAGE) {
        throw error;
      }

      fallbackPage -= 1;
    }
  }

  throw new Error('Failed to load surface types.');
};

export const useGetSurfaceTypesQuery = (
  params?: SurfaceTypeQueryParams
): UseQueryResult<SurfaceTypeListResponse, Error> => {
  const paramsKey = serializeSurfaceTypeParams(params);

  return useQuery<SurfaceTypeListResponse, Error>({
    queryKey: queryKeys.surfaceTypes.list(paramsKey),
    queryFn: (): Promise<SurfaceTypeListResponse> => fetchSurfaceTypes(params),
    staleTime: STALE_TIME_FIVE_MINUTES,
  });
};
