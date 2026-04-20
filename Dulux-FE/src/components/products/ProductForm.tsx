import type { JSX } from 'react';

import { Button } from '#/components/ui';
import { useProductFormAdapter } from '#/hooks/products';
import type {
  LinkedBasecoat,
  ProductFormSubmission,
  ProductFormValues,
  ProductImage,
  SurfaceType,
} from '#/types/products';
import {
  ProductFormCoreFieldsSection,
  ProductFormImageSection,
  ProductFormLongTextSection,
  ProductFormMappingsSection,
} from './productFormSections';

interface ProductFormProps {
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting: boolean;
  useSplitLongFieldLayout?: boolean;
  defaultBasecoatWarrantyYears?: number;
  initialValues?: ProductFormValues;
  initialImages?: ProductImage[];
  surfaceTypes: SurfaceType[];
  basecoatOptions: LinkedBasecoat[];
  onSubmit: (submission: ProductFormSubmission) => void;
  onRemoveImage?: (imageId: string) => void;
  isImageActionPending?: boolean;
  onCancel: () => void;
}

/**
 * ProductForm composes product editor sections and delegates form state logic to an adapter hook.
 *
 * @param props - Form content, data sources, and submit/cancel handlers.
 * @returns Product form section for create/edit flows.
 */
export const ProductForm = ({
  title,
  description,
  submitLabel,
  isSubmitting,
  useSplitLongFieldLayout = false,
  defaultBasecoatWarrantyYears,
  initialValues,
  initialImages = [],
  surfaceTypes,
  basecoatOptions,
  onSubmit,
  onRemoveImage,
  isImageActionPending = false,
  onCancel,
}: ProductFormProps): JSX.Element => {
  const {
    register,
    control,
    handleSubmit,
    errors,
    selectedProductType,
    selectedSurfaceTypeIds,
    selectedBasecoatIds,
    interiorSurfaceSearch,
    exteriorSurfaceSearch,
    linkedBasecoatSearch,
    activeDropdown,
    selectedImageFile,
    imageValidationError,
    interiorSelectedCount,
    exteriorSelectedCount,
    interiorDropdownOptions,
    exteriorDropdownOptions,
    basecoatDropdownOptions,
    setInteriorSurfaceSearch,
    setExteriorSurfaceSearch,
    setLinkedBasecoatSearch,
    toggleDropdown,
    toggleSurfaceSelection,
    toggleBasecoatSelection,
    handleImageFilesChange,
    handleRemoveCurrentImage,
    handleFormSubmit,
  } = useProductFormAdapter({
    defaultBasecoatWarrantyYears,
    initialImages,
    initialValues,
    surfaceTypes,
    basecoatOptions,
    onSubmit,
    onRemoveImage,
  });

  return (
    <section className='wf-card wf-card-p6 border-primary/15 bg-white'>
      <header className='mb-5 space-y-1'>
        <p className='text-xs font-semibold uppercase tracking-[2px] text-primary'>Product Editor</p>
        <h2 className='text-xl font-extrabold tracking-tight text-text-primary'>{title}</h2>
        <p className='text-sm text-text-muted'>{description}</p>
      </header>

      <form className='space-y-5' onSubmit={handleSubmit(handleFormSubmit)}>
        <ProductFormCoreFieldsSection
          register={register}
          control={control}
          errors={errors}
          selectedProductType={selectedProductType}
        />

        <ProductFormLongTextSection
          register={register}
          errors={errors}
          useSplitLongFieldLayout={useSplitLongFieldLayout}
        />

        <ProductFormImageSection
          initialImages={initialImages}
          isImageActionPending={isImageActionPending}
          selectedImageFile={selectedImageFile}
          imageValidationError={imageValidationError}
          onImageFilesChange={handleImageFilesChange}
          onRemoveImage={onRemoveImage ? handleRemoveCurrentImage : undefined}
        />

        <ProductFormMappingsSection
          errors={errors}
          selectedProductType={selectedProductType}
          selectedSurfaceTypeIds={selectedSurfaceTypeIds}
          selectedBasecoatIds={selectedBasecoatIds}
          activeDropdown={activeDropdown}
          interiorSelectedCount={interiorSelectedCount}
          exteriorSelectedCount={exteriorSelectedCount}
          interiorSurfaceSearch={interiorSurfaceSearch}
          exteriorSurfaceSearch={exteriorSurfaceSearch}
          linkedBasecoatSearch={linkedBasecoatSearch}
          interiorDropdownOptions={interiorDropdownOptions}
          exteriorDropdownOptions={exteriorDropdownOptions}
          basecoatDropdownOptions={basecoatDropdownOptions}
          onToggleDropdown={toggleDropdown}
          onInteriorSurfaceSearchChange={setInteriorSurfaceSearch}
          onExteriorSurfaceSearchChange={setExteriorSurfaceSearch}
          onLinkedBasecoatSearchChange={setLinkedBasecoatSearch}
          onToggleSurfaceSelection={toggleSurfaceSelection}
          onToggleBasecoatSelection={toggleBasecoatSelection}
        />

        <div className='flex items-center justify-end gap-2'>
          <Button type='button' variant='outline' onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type='submit'
            className='rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white hover:brightness-105'
            disabled={isSubmitting || Boolean(imageValidationError)}
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </section>
  );
};
