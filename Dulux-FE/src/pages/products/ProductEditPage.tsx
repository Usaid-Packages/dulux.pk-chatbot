/* eslint import/order: off */
import type { JSX } from 'react';

import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';

import { ProductForm } from '#/components/products';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { ROUTES } from '#/constants';
import { useGetProductByIdQuery, useGetSurfaceTypesQuery, useUpdateProductMutation } from '#/data-layer/products';
import { mapProductFormValuesToPayload, mapProductToFormValues } from '#/hooks/products';
import type { ProductFormValues } from '#/types/products';
import { getApiErrorMessage } from '#/utils';

export const ProductEditPage = (): JSX.Element => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const productId = params.id ?? '';

  const productQuery = useGetProductByIdQuery(productId);
  const surfaceTypesQuery = useGetSurfaceTypesQuery();
  const updateProductMutation = useUpdateProductMutation();

  const handleCancel = (): void => {
    navigate(ROUTES.PRODUCTS);
  };

  const handleSubmit = (values: ProductFormValues): void => {
    updateProductMutation.mutate(
      {
        id: productId,
        payload: mapProductFormValuesToPayload(values),
      },
      {
        onSuccess: () => {
          toast.success('Product updated successfully.');
          navigate(ROUTES.PRODUCTS);
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

  if (productQuery.isLoading || surfaceTypesQuery.isLoading) {
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

  if (surfaceTypesQuery.isError) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyHeader>
            <EmptyTitle>Unable to load surface types</EmptyTitle>
            <EmptyDescription>{surfaceTypesQuery.error?.message ?? 'Please try again later.'}</EmptyDescription>
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
      isSubmitting={updateProductMutation.isPending}
      initialValues={mapProductToFormValues(productQuery.data)}
      surfaceTypes={surfaceTypesQuery.data?.results ?? []}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
};
