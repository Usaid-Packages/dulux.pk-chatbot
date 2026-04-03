/* eslint import/order: off */
import type { JSX } from 'react';

import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

import { ProductForm } from '#/components/products';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { ROUTES } from '#/constants';
import { useCreateProductMutation, useGetSurfaceTypesQuery } from '#/data-layer/products';
import { mapProductFormValuesToPayload } from '#/hooks/products';
import type { ProductFormValues } from '#/types/products';
import { getApiErrorMessage } from '#/utils';

export const ProductCreatePage = (): JSX.Element => {
  const navigate = useNavigate();
  const surfaceTypesQuery = useGetSurfaceTypesQuery();
  const createProductMutation = useCreateProductMutation();

  const handleCancel = (): void => {
    navigate(ROUTES.PRODUCTS);
  };

  const handleSubmit = (values: ProductFormValues): void => {
    createProductMutation.mutate(mapProductFormValuesToPayload(values), {
      onSuccess: () => {
        toast.success('Product created successfully.');
        navigate(ROUTES.PRODUCTS);
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  if (surfaceTypesQuery.isLoading) {
    return (
      <section className='space-y-3'>
        <Skeleton className='h-12 w-64' />
        <Skeleton className='h-[540px] w-full' />
      </section>
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
      title='Add New Product'
      description='Create a new product with type, warranty, coverage, and mapped surfaces.'
      submitLabel='Create Product'
      isSubmitting={createProductMutation.isPending}
      surfaceTypes={surfaceTypesQuery.data?.results ?? []}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
};
