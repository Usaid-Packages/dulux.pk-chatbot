import type { ChangeEvent, JSX } from 'react';

import { Input } from '#/components/ui';

interface AddClaimPhotoFieldProps {
  file: File | undefined;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  errorMessage?: string;
}

/**
 * AddClaimPhotoField renders a single evidence photo input with filename and error feedback.
 */
export const AddClaimPhotoField = ({
  file,
  label,
  onChange,
  required = true,
  errorMessage,
}: AddClaimPhotoFieldProps): JSX.Element => {
  return (
    <label className='space-y-2'>
      <span className='block whitespace-nowrap text-sm font-medium text-text-primary'>
        {label} {required ? <span className='text-destructive'>*</span> : null}
      </span>
      <Input
        type='file'
        className='rounded-xl border-primary/20 bg-white file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-primary'
        accept='.jpg,.jpeg,.png,.webp'
        onChange={onChange}
      />
      {file ? <p className='text-xs text-text-muted'>Selected: {file.name}</p> : null}
      {errorMessage ? <p className='text-xs text-destructive'>{errorMessage}</p> : null}
    </label>
  );
};
