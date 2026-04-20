import type { ChangeEvent, JSX } from 'react';

import type { FieldErrors } from 'react-hook-form';

import type { CreateClaimFormValues } from '#/schemas/claim.schema';
import { AddClaimPhotoField } from './AddClaimPhotoField';

interface AddClaimPhotosSectionProps {
  alternateAnglePhoto: File | undefined;
  closeShotPhoto: File | undefined;
  errors: FieldErrors<CreateClaimFormValues>;
  longShotPhoto: File | undefined;
  onAlternateAngleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCloseShotChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLongShotChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * AddClaimPhotosSection renders required claim evidence photo inputs.
 */
export const AddClaimPhotosSection = ({
  alternateAnglePhoto,
  closeShotPhoto,
  errors,
  longShotPhoto,
  onAlternateAngleChange,
  onCloseShotChange,
  onLongShotChange,
}: AddClaimPhotosSectionProps): JSX.Element => {
  return (
    <div className='grid gap-4 md:grid-cols-3'>
      <AddClaimPhotoField
        label='Long Shot'
        file={longShotPhoto}
        onChange={onLongShotChange}
        errorMessage={errors.longShotPhoto?.message}
      />
      <AddClaimPhotoField
        label='Close Shot'
        file={closeShotPhoto}
        onChange={onCloseShotChange}
        errorMessage={errors.closeShotPhoto?.message}
      />
      <AddClaimPhotoField
        label='Alternate Angle'
        file={alternateAnglePhoto}
        onChange={onAlternateAngleChange}
        errorMessage={errors.alternateAnglePhoto?.message}
      />
    </div>
  );
};
