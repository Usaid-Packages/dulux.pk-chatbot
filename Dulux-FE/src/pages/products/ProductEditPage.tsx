import type { JSX } from 'react';

import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ProductForm } from '#/components/products';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { ROUTES } from '#/constants';
import {
  useAttachProductImageMutation,
  useGetProductByIdQuery,
  useGetProductsQuery,
  useGetSurfaceTypesQuery,
  useRemoveProductImageMutation,
  useUploadProductImageMutation,
  useUpdateProductMutation,
} from '#/data-layer/products';
import { mapProductFormValuesToPayload, mapProductToFormValues } from '#/hooks/products';
import { PRODUCT_TYPES } from '#/types/products';
import type { LinkedBasecoat, ProductFormSubmission, SurfaceType } from '#/types/products';
import { getApiErrorMessage } from '#/utils';

const EMPTY_SURFACE_TYPES: SurfaceType[] = [];
const EMPTY_BASECOAT_OPTIONS: LinkedBasecoat[] = [];

export const ProductEditPage = (): JSX.Element => {
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

  const uploadAndAttachImage = async (imageFile: File): Promise<void> => {
    const imageId = await uploadProductImageMutation.mutateAsync(imageFile);
    await attachProductImageMutation.mutateAsync({
      productId,
      payload: {
        image_id: imageId,
      },
    });
  };

  const handleSubmit = ({ values, imageFile }: ProductFormSubmission): void => {
    updateProductMutation.mutate(
      {
        id: productId,
        payload: mapProductFormValuesToPayload(values),
      },
      {
        onSuccess: async () => {
          try {
            if (imageFile) {
              await uploadAndAttachImage(imageFile);
            }
            toast.success('Product updated successfully.');
          } catch (error) {
            toast.warn(`Product updated, but image upload failed: ${getApiErrorMessage(error)}`);
          } finally {
            navigate(`${ROUTES.PRODUCTS}${location.search}`);
          }
        },
        onError: error => {
          toast.error(getApiErrorMessage(error));
        },
      }
    );
  };

  const handleRemoveImage = (imageId: string): void => {
    removeProductImageMutation.mutate(
      {
        productId,
        imageId,
      },
      {
        onSuccess: () => {
          toast.success('Product image removed.');
        },
        onError: error => {
          toast.error(getApiErrorMessage(error));
        },
      }
    );
  };

  if (!productId) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyHeader>
            <EmptyTitle>Invalid product id</EmptyTitle>
            <EmptyDescription>Unable to open product details.</EmptyDescription>
          </EmptyHeader>
        </EmptyContent>
      </Empty>
    );
  }

  if (productQuery.isLoading || surfaceTypesQuery.isLoading || basecoatOptionsQuery.isLoading) {
    return (
      <section className='space-y-3'>
        <Skeleton className='h-12 w-64' />
        <Skeleton className='h-[540px] w-full' />
      </section>
    );
  }

  if (productQuery.isError || !productQuery.data) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyHeader>
            <EmptyTitle>Unable to load product</EmptyTitle>
            <EmptyDescription>{productQuery.error?.message ?? 'Product not found.'}</EmptyDescription>
          </EmptyHeader>
        </EmptyContent>
      </Empty>
    );
  }

  if (surfaceTypesQuery.isError || basecoatOptionsQuery.isError) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyHeader>
            <EmptyTitle>Unable to load product dependencies</EmptyTitle>
            <EmptyDescription>
              {surfaceTypesQuery.error?.message ?? basecoatOptionsQuery.error?.message ?? 'Please try again later.'}
            </EmptyDescription>
          </EmptyHeader>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <ProductForm
      title='Edit Product'
      description='Update product details and surface mappings.'
      submitLabel='Save Changes'
      isSubmitting={
        updateProductMutation.isPending || uploadProductImageMutation.isPending || attachProductImageMutation.isPending
      }
      initialValues={mapProductToFormValues(productQuery.data)}
      initialImages={productQuery.data.images}
      surfaceTypes={surfaceTypesQuery.data?.results ?? EMPTY_SURFACE_TYPES}
      basecoatOptions={basecoatOptionsQuery.data?.results ?? EMPTY_BASECOAT_OPTIONS}
      onSubmit={handleSubmit}
      onRemoveImage={handleRemoveImage}
      isImageActionPending={removeProductImageMutation.isPending}
      onCancel={handleCancel}
    />
  );
};
