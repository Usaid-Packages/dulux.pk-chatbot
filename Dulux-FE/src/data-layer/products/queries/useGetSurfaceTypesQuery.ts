import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { apiEndpoints, GET, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { SurfaceTypeListResponse, SurfaceTypeQueryParams } from '#/types/products';
import {
  normalizeSurfaceTypesResponse,
  serializeSurfaceTypeParams,
  type PaginatedApiResponse,
  type SurfaceTypeApiResponse,
} from './shared';

const STALE_TIME_FIVE_MINUTES = 5 * 60 * 1000;

const fetchSurfaceTypes = async (params?: SurfaceTypeQueryParams): Promise<SurfaceTypeListResponse> => {
  const response = await performRequest<
    PaginatedApiResponse<SurfaceTypeApiResponse>,
    undefined,
    SurfaceTypeQueryParams
  >({
    method: GET,
    url: apiEndpoints.products.surfaceTypes,
    params,
  });

  return normalizeSurfaceTypesResponse(response);
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
