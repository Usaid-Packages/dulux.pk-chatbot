import type { JSX } from 'react';

import { ProductForm } from '#/components/products';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { useProductEditPageController } from '#/hooks/products';

export const ProductEditPage = (): JSX.Element => {
  const {
    isInvalidProductId,
    isLoading,
    isProductError,
    productErrorMessage,
    isDependenciesError,
    dependenciesErrorMessage,
    isSubmitting,
    isImageActionPending,
    initialValues,
    initialImages,
    surfaceTypes,
    basecoatOptions,
    handleSubmit,
    handleRemoveImage,
    handleCancel,
  } = useProductEditPageController();

  if (isInvalidProductId) {
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

  if (isLoading) {
    return (
      <section className='space-y-3'>
        <Skeleton className='h-12 w-64' />
        <Skeleton className='h-[540px] w-full' />
      </section>
    );
  }

  if (isProductError) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyHeader>
            <EmptyTitle>Unable to load product</EmptyTitle>
            <EmptyDescription>{productErrorMessage}</EmptyDescription>
          </EmptyHeader>
        </EmptyContent>
      </Empty>
    );
  }

  if (isDependenciesError) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyHeader>
            <EmptyTitle>Unable to load product dependencies</EmptyTitle>
            <EmptyDescription>{dependenciesErrorMessage}</EmptyDescription>
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
      isSubmitting={isSubmitting}
      initialValues={initialValues}
      initialImages={initialImages}
      surfaceTypes={surfaceTypes}
      basecoatOptions={basecoatOptions}
      onSubmit={handleSubmit}
      onRemoveImage={handleRemoveImage}
      isImageActionPending={isImageActionPending}
      onCancel={handleCancel}
    />
  );
};
