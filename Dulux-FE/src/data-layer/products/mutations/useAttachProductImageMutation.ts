/* eslint import/order: off */
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { apiEndpoints, queryKeys } from '#/constants';
import { performRequest } from '#/services';
import type { AttachProductImagePayload, ProductImage } from '#/types/products';
import { normalizeProductImage, type ProductImageApiResponse } from '../queries/shared';

interface AttachProductImageVariables {
  productId: string;
  payload: AttachProductImagePayload;
}

const attachProductImage = async ({ productId, payload }: AttachProductImageVariables): Promise<ProductImage> => {
  const response = await performRequest<ProductImageApiResponse, AttachProductImagePayload>({
    method: 'post',
    url: apiEndpoints.products.images(productId),
    payload,
  });

  return normalizeProductImage(response);
};

export const useAttachProductImageMutation = (): UseMutationResult<
  ProductImage,
  Error,
  AttachProductImageVariables
> => {
  const queryClient = useQueryClient();

  return useMutation<ProductImage, Error, AttachProductImageVariables>({
    mutationFn: attachProductImage,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.images(variables.productId) });
    },
  });
};
