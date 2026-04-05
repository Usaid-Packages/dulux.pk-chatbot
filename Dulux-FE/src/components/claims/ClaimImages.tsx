import type { JSX } from 'react';

import { Button } from '#/components/ui';
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
  return (
    <section className='wf-card wf-card-p4'>
      <h2 className='text-md font-semibold text-text-primary'>Evidence Photos</h2>
      <p className='mt-1 text-sm text-text-muted'>Submitted by customer for technical assessment.</p>
      <div className='mt-4 grid gap-4 sm:grid-cols-3'>
        {photos.map(photo => (
          <article key={photo.id} className='wf-card-muted p-2'>
            <img className='h-44 w-full rounded-md object-cover' src={photo.url} alt={photo.label} loading='lazy' />
            <p className='mt-2 text-sm font-medium text-text-primary'>{photo.label}</p>
            <div className='mt-2 flex gap-2'>
              <Button size='sm' variant='outline' asChild>
                <a href={photo.url} target='_blank' rel='noopener noreferrer'>
                  Zoom
                </a>
              </Button>
              <Button size='sm' variant='outline' asChild>
                <a href={photo.url} target='_blank' rel='noopener noreferrer' download>
                  Download
                </a>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
