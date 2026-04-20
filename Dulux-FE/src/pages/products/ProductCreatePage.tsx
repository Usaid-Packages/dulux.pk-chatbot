import type { JSX } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ProductForm } from '#/components/products';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { ROUTES } from '#/constants';
import {
  useAttachProductImageMutation,
  useCreateProductMutation,
  useGetProductsQuery,
  useGetSurfaceTypesQuery,
  useUploadProductImageMutation,
} from '#/data-layer/products';
import { mapProductFormValuesToPayload } from '#/hooks/products';
import { PRODUCT_TYPES } from '#/types/products';
import type { LinkedBasecoat, ProductFormSubmission, SurfaceType } from '#/types/products';
import { getApiErrorMessage } from '#/utils';

const EMPTY_SURFACE_TYPES: SurfaceType[] = [];
const EMPTY_BASECOAT_OPTIONS: LinkedBasecoat[] = [];

export const ProductCreatePage = (): JSX.Element => {
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

  if (surfaceTypesQuery.isLoading || basecoatOptionsQuery.isLoading) {
    return (
      <section className='space-y-3'>
        <Skeleton className='h-12 w-64' />
        <Skeleton className='h-[540px] w-full' />
      </section>
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
      title='Add New Product'
      description='Create a new product with type, warranty, coverage, and mapped surfaces.'
      submitLabel='Create Product'
      defaultBasecoatWarrantyYears={0}
      isSubmitting={
        createProductMutation.isPending || uploadProductImageMutation.isPending || attachProductImageMutation.isPending
      }
      useSplitLongFieldLayout
      surfaceTypes={surfaceTypesQuery.data?.results ?? EMPTY_SURFACE_TYPES}
      basecoatOptions={basecoatOptionsQuery.data?.results ?? EMPTY_BASECOAT_OPTIONS}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
};
