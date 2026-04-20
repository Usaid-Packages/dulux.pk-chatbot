import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ROUTES } from '#/constants';
import {
  useAttachProductImageMutation,
  useCreateProductMutation,
  useGetProductsQuery,
  useGetSurfaceTypesQuery,
  useUploadProductImageMutation,
} from '#/data-layer/products';
import { PRODUCT_TYPES } from '#/types/products';
import type { LinkedBasecoat, ProductFormSubmission, SurfaceType } from '#/types/products';
import { getApiErrorMessage } from '#/utils';
import { mapProductFormValuesToPayload } from './productHelpers';

const EMPTY_SURFACE_TYPES: SurfaceType[] = [];
const EMPTY_BASECOAT_OPTIONS: LinkedBasecoat[] = [];

interface UseProductCreatePageControllerResult {
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  isSubmitting: boolean;
  surfaceTypes: SurfaceType[];
  basecoatOptions: LinkedBasecoat[];
  handleCancel: () => void;
  handleSubmit: (submission: ProductFormSubmission) => void;
}

/**
 * useProductCreatePageController owns product-create data fetching and submit orchestration.
 *
 * @returns Product-create page state and handlers for composition-only page rendering.
 */
export const useProductCreatePageController = (): UseProductCreatePageControllerResult => {
  const location = useLocation();
  const navigate = useNavigate();
  const surfaceTypesQuery = useGetSurfaceTypesQuery();
  const basecoatOptionsQuery = useGetProductsQuery({
    product_type: PRODUCT_TYPES.BASECOAT,
    ordering: 'name',
    page_size: 100,
  });
  const createProductMutation = useCreateProductMutation();
  const uploadProductImageMutation = useUploadProductImageMutation();
  const attachProductImageMutation = useAttachProductImageMutation();

  const handleCancel = (): void => {
    navigate(`${ROUTES.PRODUCTS}${location.search}`);
  };

  const uploadAndAttachImage = async (productId: string, imageFile: File): Promise<void> => {
    const imageId = await uploadProductImageMutation.mutateAsync(imageFile);
    await attachProductImageMutation.mutateAsync({
      productId,
      payload: {
        image_id: imageId,
      },
    });
  };

  const handleSubmit = ({ values, imageFile }: ProductFormSubmission): void => {
    createProductMutation.mutate(mapProductFormValuesToPayload(values), {
      onSuccess: async createdProduct => {
        try {
          if (imageFile) {
            await uploadAndAttachImage(String(createdProduct.id), imageFile);
          }
          toast.success('Product created successfully.');
        } catch (error) {
          toast.warn(`Product created, but image upload failed: ${getApiErrorMessage(error)}`);
        } finally {
          navigate(`${ROUTES.PRODUCTS}${location.search}`);
        }
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  return {
    isLoading: surfaceTypesQuery.isLoading || basecoatOptionsQuery.isLoading,
    isError: surfaceTypesQuery.isError || basecoatOptionsQuery.isError,
    errorMessage: surfaceTypesQuery.error?.message ?? basecoatOptionsQuery.error?.message ?? 'Please try again later.',
    isSubmitting:
      createProductMutation.isPending || uploadProductImageMutation.isPending || attachProductImageMutation.isPending,
    surfaceTypes: surfaceTypesQuery.data?.results ?? EMPTY_SURFACE_TYPES,
    basecoatOptions: basecoatOptionsQuery.data?.results ?? EMPTY_BASECOAT_OPTIONS,
    handleCancel,
    handleSubmit,
  };
};
