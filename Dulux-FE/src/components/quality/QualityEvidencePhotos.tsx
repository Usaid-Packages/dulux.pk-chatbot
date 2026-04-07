import type { JSX } from 'react';

import { ImagePreviewGallery } from '#/components/ui';
import type { ClaimEvidencePhoto } from '#/types/claims.types';

interface QualityEvidencePhotosProps {
  photos: ClaimEvidencePhoto[];
}

/**
 * QualityEvidencePhotos renders larger evidence previews for technical inspection.
 *
 * @param props - Evidence photos.
 * @returns Evidence section with enlarge hint.
 */
export const QualityEvidencePhotos = ({ photos }: QualityEvidencePhotosProps): JSX.Element => {
  return (
    <ImagePreviewGallery
      title='Evidence Photos'
      description='Click any image to open full preview.'
      items={photos}
      fallbackModalTitle='Evidence Photo'
    />
  );
};
