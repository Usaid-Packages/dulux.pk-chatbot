import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, POST, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { LoginApiResponse, LoginPayload } from '#/types/auth.types';

export const useLoginMutation = (): UseMutationResult<LoginApiResponse, Error, LoginPayload> => {
  return useMutation<LoginApiResponse, Error, LoginPayload>({
    mutationKey: [queryKeys.auth.login],
    mutationFn: (payload: LoginPayload): Promise<LoginApiResponse> =>
      performRequest<LoginApiResponse, LoginPayload>({
        method: POST,
        url: apiEndpoints.auth.login,
        payload,
      }),
  });
};
