import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ROUTES } from '#/constants';
import {
  useAttachProductImageMutation,
  useGetProductByIdQuery,
  useGetProductsQuery,
  useGetSurfaceTypesQuery,
  useRemoveProductImageMutation,
  useUpdateProductMutation,
  useUploadProductImageMutation,
} from '#/data-layer/products';
import { executeMutationWithFeedback } from '#/hooks/common/mutationFeedback';
import { PRODUCT_TYPES } from '#/types/products';
import type {
  LinkedBasecoat,
  ProductFormValues,
  ProductFormSubmission,
  ProductImage,
  SurfaceType,
} from '#/types/products';
import { getApiErrorMessage } from '#/utils';
import { mapProductFormValuesToPayload, mapProductToFormValues } from './productHelpers';
import { orchestrateProductImageMutations } from './productImageMutationOrchestrator';

const EMPTY_SURFACE_TYPES: SurfaceType[] = [];
const EMPTY_BASECOAT_OPTIONS: LinkedBasecoat[] = [];
const EMPTY_IMAGES: ProductImage[] = [];

interface UseProductEditPageControllerResult {
  isInvalidProductId: boolean;
  isLoading: boolean;
  isProductError: boolean;
  productErrorMessage: string;
  isDependenciesError: boolean;
  dependenciesErrorMessage: string;
  isSubmitting: boolean;
  isImageActionPending: boolean;
  initialValues?: ProductFormValues;
  initialImages: ProductImage[];
  surfaceTypes: SurfaceType[];
  basecoatOptions: LinkedBasecoat[];
  handleCancel: () => void;
  handleSubmit: (submission: ProductFormSubmission) => void;
  handleRemoveImage: (imageId: string) => void;
}

/**
 * useProductEditPageController owns product-edit data loading and mutation orchestration.
 *
 * @returns Product-edit page state and actions for composition-only rendering.
 */
export const useProductEditPageController = (): UseProductEditPageControllerResult => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id: string }>();
  const productId = params.id ?? '';

  const productQuery = useGetProductByIdQuery(productId);
  const surfaceTypesQuery = useGetSurfaceTypesQuery();
  const basecoatOptionsQuery = useGetProductsQuery({
    product_type: PRODUCT_TYPES.BASECOAT,
    ordering: 'name',
    page_size: 100,
  });
  const updateProductMutation = useUpdateProductMutation();
  const uploadProductImageMutation = useUploadProductImageMutation();
  const attachProductImageMutation = useAttachProductImageMutation();
  const removeProductImageMutation = useRemoveProductImageMutation();

  const handleCancel = (): void => {
    navigate(`${ROUTES.PRODUCTS}${location.search}`);
  };

  const handleSubmit = ({ values, imageFile }: ProductFormSubmission): void => {
    executeMutationWithFeedback({
      mutate: updateProductMutation.mutate,
      payload: {
        id: productId,
        payload: mapProductFormValuesToPayload(values),
      },
      successMessage: 'Product updated successfully.',
      showSuccessToast: false,
      onSuccess: () => {
        const navigateToProducts = (): void => {
          navigate(`${ROUTES.PRODUCTS}${location.search}`);
        };

        orchestrateProductImageMutations({
          productId,
          imageFile,
          uploadProductImageMutation,
          attachProductImageMutation,
          onSuccess: () => {
            toast.success('Product updated successfully.');
            navigateToProducts();
          },
          onError: error => {
            toast.warn(`Product updated, but image upload failed: ${getApiErrorMessage(error)}`);
            navigateToProducts();
          },
        });
      },
    });
  };

  const handleRemoveImage = (imageId: string): void => {
    executeMutationWithFeedback({
      mutate: removeProductImageMutation.mutate,
      payload: {
        productId,
        imageId,
      },
      successMessage: 'Product image removed.',
    });
  };

  return {
    isInvalidProductId: productId.length === 0,
    isLoading: productQuery.isLoading || surfaceTypesQuery.isLoading || basecoatOptionsQuery.isLoading,
    isProductError: productQuery.isError || !productQuery.data,
    productErrorMessage: productQuery.error?.message ?? 'Product not found.',
    isDependenciesError: surfaceTypesQuery.isError || basecoatOptionsQuery.isError,
    dependenciesErrorMessage:
      surfaceTypesQuery.error?.message ?? basecoatOptionsQuery.error?.message ?? 'Please try again later.',
    isSubmitting:
      updateProductMutation.isPending || uploadProductImageMutation.isPending || attachProductImageMutation.isPending,
    isImageActionPending: removeProductImageMutation.isPending,
    initialValues: productQuery.data ? mapProductToFormValues(productQuery.data) : undefined,
    initialImages: productQuery.data?.images ?? EMPTY_IMAGES,
    surfaceTypes: surfaceTypesQuery.data?.results ?? EMPTY_SURFACE_TYPES,
    basecoatOptions: basecoatOptionsQuery.data?.results ?? EMPTY_BASECOAT_OPTIONS,
    handleCancel,
    handleSubmit,
    handleRemoveImage,
  };
};
