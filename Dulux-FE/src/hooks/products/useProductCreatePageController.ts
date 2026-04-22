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
import { orchestrateProductImageMutations } from './productImageMutationOrchestrator';

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

  const handleSubmit = ({ values, imageFile }: ProductFormSubmission): void => {
    createProductMutation.mutate(mapProductFormValuesToPayload(values), {
      onSuccess: createdProduct => {
        const createdProductId = String(createdProduct.id);
        const navigateToProducts = (): void => {
          navigate(`${ROUTES.PRODUCTS}${location.search}`);
        };

        orchestrateProductImageMutations({
          productId: createdProductId,
          imageFile,
          uploadProductImageMutation,
          attachProductImageMutation,
          onSuccess: () => {
            toast.success('Product created successfully.');
            navigateToProducts();
          },
          onError: error => {
            toast.warn(`Product created, but image upload failed: ${getApiErrorMessage(error)}`);
            navigateToProducts();
          },
        });
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
