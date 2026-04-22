import type { ChangeEventHandler, JSX, MouseEvent } from 'react';

import { Button, Input } from '#/components/ui';
import type { ProductImage } from '#/types/products';

interface ProductFormImageSectionProps {
  initialImages: ProductImage[];
  isImageActionPending: boolean;
  selectedImageFile: File | null;
  imageValidationError: string | null;
  onImageFilesChange: ChangeEventHandler<HTMLInputElement>;
  onRemoveImage?: (imageId: number) => void;
}

/**
 * ProductFormImageSection renders image upload and existing-image removal controls.
 *
 * @param props - Existing image state, upload/remove handlers, and validation messaging.
 * @returns Product image block for single-image management.
 */
export const ProductFormImageSection = ({
  initialImages,
  isImageActionPending,
  selectedImageFile,
  imageValidationError,
  onImageFilesChange,
  onRemoveImage,
}: ProductFormImageSectionProps): JSX.Element => {
  const handleRemoveImageClick = (event: MouseEvent<HTMLButtonElement>): void => {
    if (!onRemoveImage) {
      return;
    }

    const imageId = Number(event.currentTarget.dataset.imageId);
    if (!Number.isInteger(imageId) || imageId <= 0) {
      return;
    }

    onRemoveImage(imageId);
  };

  return (
    <div className='space-y-3 rounded-xl border border-primary/20 bg-white/85 p-4'>
      <div>
        <p className='text-sm font-medium text-text-primary'>
          Product Images <span className='text-destructive'>*</span>
        </p>
        <p className='text-xs text-text-muted'>Upload one product image (JPG, PNG, WEBP. Max 5MB).</p>
      </div>
      <Input
        type='file'
        accept='image/jpeg,image/png,image/webp'
        className='rounded-xl border-primary/20 bg-white file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-primary'
        disabled={initialImages.length > 0 || isImageActionPending}
        onChange={onImageFilesChange}
      />
      {selectedImageFile ? <p className='text-xs text-text-muted'>Selected image: {selectedImageFile.name}</p> : null}
      {imageValidationError ? <p className='text-xs text-destructive'>{imageValidationError}</p> : null}
      {initialImages.length > 0 ? (
        <div className='space-y-2'>
          <p className='text-xs font-medium uppercase tracking-[1.2px] text-text-muted'>Current Image</p>
          <p className='text-xs text-text-muted'>Remove the current image before uploading a replacement.</p>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {initialImages.map(productImage => {
              const imageUrl = productImage.image.url || productImage.image.image;
              return (
                <div key={productImage.id} className='space-y-2 rounded-lg border border-primary/15 bg-white p-2'>
                  <img
                    src={imageUrl}
                    alt='Current product preview'
                    className='h-24 w-full rounded-md border border-primary/10 object-cover'
                  />
                  {onRemoveImage ? (
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='w-full'
                      disabled={isImageActionPending}
                      data-image-id={productImage.id}
                      onClick={handleRemoveImageClick}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};
