import type { JSX } from 'react';
import { useState } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './Dialog';

export interface ImagePreviewGalleryItem {
  id: string | number;
  label: string;
  url: string;
}

interface ImagePreviewGalleryProps {
  title: string;
  description: string;
  items: ImagePreviewGalleryItem[];
  emptyMessage?: string;
  modalDescription?: string;
  fallbackModalTitle?: string;
}

/**
 * ImagePreviewGallery renders clickable image cards with a shared full-size preview modal.
 *
 * @param props - Section metadata and gallery items.
 * @returns Gallery section with preview dialog.
 */
export const ImagePreviewGallery = ({
  title,
  description,
  items,
  emptyMessage = 'No images available.',
  modalDescription = 'Full-size image preview',
  fallbackModalTitle = 'Image Preview',
}: ImagePreviewGalleryProps): JSX.Element => {
  const [activeImage, setActiveImage] = useState<ImagePreviewGalleryItem | null>(null);
  const [isModalImageLoading, setModalImageLoading] = useState(false);
  const [loadedImageMap, setLoadedImageMap] = useState<Record<string, boolean>>({});

  const toImageKey = (id: string | number): string => String(id);

  const openImageModal = (image: ImagePreviewGalleryItem): void => {
    setActiveImage(image);
    setModalImageLoading(true);
  };

  const markImageLoaded = (id: string | number): void => {
    const imageKey = toImageKey(id);
    setLoadedImageMap(previous => ({ ...previous, [imageKey]: true }));
  };

  const handleModalOpenChange = (open: boolean): void => {
    if (!open) {
      setActiveImage(null);
      setModalImageLoading(false);
    }
  };

  return (
    <>
      <section className='wf-card wf-card-p4'>
        <h2 className='text-md font-semibold text-text-primary'>{title}</h2>
        <p className='mt-1 text-sm text-text-muted'>{description}</p>

        {items.length === 0 ? (
          <p className='mt-4 rounded-md border border-dashed border-border px-3 py-4 text-sm text-text-muted'>
            {emptyMessage}
          </p>
        ) : (
          <div className='mt-4 grid gap-4 sm:grid-cols-3'>
            {items.map(image => (
              <button
                key={image.id}
                type='button'
                className='wf-card-muted group p-2 text-left transition hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                onClick={() => openImageModal(image)}
              >
                <div className='relative'>
                  {!loadedImageMap[toImageKey(image.id)] ? (
                    <div
                      className='absolute inset-0 z-10 flex animate-pulse items-center justify-center rounded-md bg-surface-subtle text-xs font-semibold text-text-muted'
                      aria-hidden='true'
                    >
                      Loading image...
                    </div>
                  ) : null}
                  <img
                    className={[
                      'h-44 w-full rounded-md object-cover transition-all duration-500 ease-out',
                      loadedImageMap[toImageKey(image.id)]
                        ? 'scale-100 opacity-100 blur-0'
                        : 'scale-[1.02] opacity-0 blur-[1px]',
                    ].join(' ')}
                    src={image.url}
                    alt={image.label}
                    loading='lazy'
                    onLoad={() => markImageLoaded(image.id)}
                    onError={() => markImageLoaded(image.id)}
                  />
                  <span className='pointer-events-none absolute inset-x-2 bottom-2 rounded bg-black/55 px-2 py-1 text-xs font-medium text-white opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100'>
                    Open image
                  </span>
                </div>
                <p className='mt-2 text-sm font-medium text-text-primary'>{image.label}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      <Dialog open={Boolean(activeImage)} onOpenChange={handleModalOpenChange}>
        <DialogContent className='max-w-4xl'>
          <DialogHeader>
            <DialogTitle>{activeImage?.label ?? fallbackModalTitle}</DialogTitle>
            <DialogDescription>{modalDescription}</DialogDescription>
          </DialogHeader>
          {activeImage ? (
            <div className='relative h-[72vh] w-full rounded-md bg-surface-muted'>
              {isModalImageLoading ? (
                <div className='absolute inset-0 z-10 animate-pulse rounded-md bg-surface-subtle' aria-hidden='true' />
              ) : null}
              <img
                className={[
                  'h-full w-full rounded-md object-contain transition-all duration-500 ease-out',
                  isModalImageLoading ? 'scale-[0.985] opacity-0 blur-[1px]' : 'scale-100 opacity-100 blur-0',
                ].join(' ')}
                src={activeImage.url}
                alt={activeImage.label}
                loading='eager'
                onLoad={() => setModalImageLoading(false)}
                onError={() => setModalImageLoading(false)}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};
