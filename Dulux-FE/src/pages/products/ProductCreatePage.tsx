import type { JSX } from 'react';

import { ProductForm } from '#/components/products';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { useProductCreatePageController } from '#/hooks/products';

export const ProductCreatePage = (): JSX.Element => {
  const { isLoading, isError, errorMessage, isSubmitting, surfaceTypes, basecoatOptions, handleSubmit, handleCancel } =
    useProductCreatePageController();

  if (isLoading) {
    return (
      <section className='space-y-3'>
        <Skeleton className='h-12 w-64' />
        <Skeleton className='h-[540px] w-full' />
      </section>
    );
  }

  if (isError) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyHeader>
            <EmptyTitle>Unable to load product dependencies</EmptyTitle>
            <EmptyDescription>{errorMessage}</EmptyDescription>
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
      isSubmitting={isSubmitting}
      useSplitLongFieldLayout
      surfaceTypes={surfaceTypes}
      basecoatOptions={basecoatOptions}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
};
