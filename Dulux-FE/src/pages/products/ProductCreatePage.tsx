import type { JSX } from 'react';

import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ProductForm } from '#/components/products';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { ROUTES } from '#/constants';
import { useCreateProductMutation, useGetProductsQuery, useGetSurfaceTypesQuery } from '#/data-layer/products';
import { mapProductFormValuesToPayload } from '#/hooks/products';
import type { LinkedBasecoat, ProductFormValues, SurfaceType } from '#/types/products';
import { getApiErrorMessage } from '#/utils';

const EMPTY_SURFACE_TYPES: SurfaceType[] = [];
const EMPTY_BASECOAT_OPTIONS: LinkedBasecoat[] = [];

export const ProductCreatePage = (): JSX.Element => {
  const navigate = useNavigate();
  const surfaceTypesQuery = useGetSurfaceTypesQuery();
  const basecoatOptionsQuery = useGetProductsQuery({
    product_type: 'BASECOAT',
    ordering: 'name',
    page_size: 100,
  });
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
      isSubmitting={createProductMutation.isPending}
      surfaceTypes={surfaceTypesQuery.data?.results ?? EMPTY_SURFACE_TYPES}
      basecoatOptions={basecoatOptionsQuery.data?.results ?? EMPTY_BASECOAT_OPTIONS}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
};
