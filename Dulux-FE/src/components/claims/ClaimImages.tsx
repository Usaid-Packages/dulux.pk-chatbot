import type { JSX } from 'react';

import { ImagePreviewGallery } from '#/components/ui';
import type { ClaimEvidencePhoto } from '#/types/claims.types';

interface ClaimImagesProps {
  photos: ClaimEvidencePhoto[];
}

const extractFileNameFromUrl = (url: string): string | null => {
  if (!url.trim()) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    const lastPathPart = pathParts[pathParts.length - 1];

    if (!lastPathPart) {
      return null;
    }

    const decodedFileName = decodeURIComponent(lastPathPart).trim();
    return decodedFileName.length > 0 ? decodedFileName : null;
  } catch {
    return null;
  }
};

const withFileNameInLabel = (photo: ClaimEvidencePhoto): ClaimEvidencePhoto => {
  const fileName = extractFileNameFromUrl(photo.url);
  if (!fileName) {
    return photo;
  }

  return {
    ...photo,
    label: `${photo.label} (${fileName})`,
  };
};

/**
 * ClaimImages displays evidence images with open/download actions.
 *
 * @param props - Evidence photos for the claim.
 * @returns Evidence gallery section.
 */
export const ClaimImages = ({ photos }: ClaimImagesProps): JSX.Element => {
  const galleryItems = photos.map(withFileNameInLabel);

  return (
    <ImagePreviewGallery
      title='Evidence Photos'
      description='Click any image to open full preview.'
      items={galleryItems}
      fallbackModalTitle='Evidence Photo'
    />
  );
};
