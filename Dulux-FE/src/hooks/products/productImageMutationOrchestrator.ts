import type { UseMutationResult } from '@tanstack/react-query';

interface AttachProductImageVariables {
  productId: string;
  payload: {
    image_id: number;
  };
}

interface ProductImageMutationOrchestratorParams<TAttachData> {
  productId: string;
  imageFile: File | null;
  uploadProductImageMutation: UseMutationResult<number, Error, File>;
  attachProductImageMutation: UseMutationResult<TAttachData, Error, AttachProductImageVariables>;
  onSuccess: () => void;
  onError: (error: Error) => void;
}

/**
 * orchestrateProductImageMutations runs upload -> attach flow with mutation callbacks.
 *
 * @param params - Product/image identifiers, mutation refs, and terminal callbacks.
 * @returns Void; terminal callbacks receive success/error outcome.
 */
export const orchestrateProductImageMutations = <TAttachData>({
  productId,
  imageFile,
  uploadProductImageMutation,
  attachProductImageMutation,
  onSuccess,
  onError,
}: ProductImageMutationOrchestratorParams<TAttachData>): void => {
  if (!imageFile) {
    onSuccess();
    return;
  }

  uploadProductImageMutation.mutate(imageFile, {
    onSuccess: imageId => {
      attachProductImageMutation.mutate(
        {
          productId,
          payload: {
            image_id: imageId,
          },
        },
        {
          onSuccess: () => {
            onSuccess();
          },
          onError: error => {
            onError(error);
          },
        }
      );
    },
    onError: error => {
      onError(error);
    },
  });
};
