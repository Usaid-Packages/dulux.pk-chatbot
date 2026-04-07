import type { JSX } from 'react';

import { ImagePreviewGallery } from '#/components/ui';
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
    <ImagePreviewGallery
      title='Evidence Photos'
      description='Click any image to open full preview.'
      items={photos}
      fallbackModalTitle='Evidence Photo'
    />
  );
};
