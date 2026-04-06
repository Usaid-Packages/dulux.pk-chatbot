import type { JSX } from 'react';
import { useState } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui';
import type { ClaimEvidencePhoto } from '#/types/claims.types';

interface ClaimImagesProps {
  photos: ClaimEvidencePhoto[];
}

/**
 * ClaimImages displays evidence images with open/download actions.
 *
 * @param props - Evidence photos for the claim.
 * @returns Evidence gallery section.
 */
export const ClaimImages = ({ photos }: ClaimImagesProps): JSX.Element => {
  const [activePhoto, setActivePhoto] = useState<ClaimEvidencePhoto | null>(null);

  const openPhotoModal = (photo: ClaimEvidencePhoto): void => {
    setActivePhoto(photo);
  };

  const handleModalOpenChange = (open: boolean): void => {
    if (!open) {
      setActivePhoto(null);
    }
  };

  return (
    <>
      <section className='wf-card wf-card-p4'>
        <h2 className='text-md font-semibold text-text-primary'>Evidence Photos</h2>
        <p className='mt-1 text-sm text-text-muted'>Click any image to open full preview.</p>
        <div className='mt-4 grid gap-4 sm:grid-cols-3'>
          {photos.map(photo => (
            <button
              key={photo.id}
              type='button'
              className='wf-card-muted group p-2 text-left transition hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              onClick={() => openPhotoModal(photo)}
            >
              <div className='relative'>
                <img className='h-44 w-full rounded-md object-cover' src={photo.url} alt={photo.label} loading='lazy' />
                <span className='pointer-events-none absolute inset-x-2 bottom-2 rounded bg-black/55 px-2 py-1 text-xs font-medium text-white opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100'>
                  Open image
                </span>
              </div>
              <p className='mt-2 text-sm font-medium text-text-primary'>{photo.label}</p>
            </button>
          ))}
        </div>
      </section>

      <Dialog open={Boolean(activePhoto)} onOpenChange={handleModalOpenChange}>
        <DialogContent className='max-w-4xl'>
          <DialogHeader>
            <DialogTitle>{activePhoto?.label ?? 'Evidence Photo'}</DialogTitle>
            <DialogDescription>Full-size image preview</DialogDescription>
          </DialogHeader>
          {activePhoto ? (
            <img
              className='max-h-[75vh] w-full rounded-md object-contain'
              src={activePhoto.url}
              alt={activePhoto.label}
              loading='lazy'
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};
