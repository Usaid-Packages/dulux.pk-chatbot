import type { JSX } from 'react';

import { Input, Textarea } from '#/components/ui';
import { NOTES_MAX_LENGTH, NOTES_MAX_LENGTH_HELPER_TEXT } from '#/constants';
import type { AddClaimDetailsSectionProps } from '#/types/claims.form.types';

/**
 * AddClaimDetailsSection renders affected-area and notes fields.
 */
export const AddClaimDetailsSection = ({ errors, register }: AddClaimDetailsSectionProps): JSX.Element => {
  return (
    <>
      <div className='space-y-2'>
        <label htmlFor='claim-area' className='text-sm font-medium text-text-primary'>
          Affected Area (sq ft) <span className='text-destructive'>*</span>
        </label>
        <Input
          id='claim-area'
          type='number'
          step='0.01'
          inputMode='decimal'
          className='rounded-xl border-primary/20 bg-white'
          {...register('affectedAreaSqft')}
          aria-invalid={Boolean(errors.affectedAreaSqft)}
        />
        {errors.affectedAreaSqft ? <p className='text-xs text-destructive'>{errors.affectedAreaSqft.message}</p> : null}
      </div>

      <div className='space-y-2'>
        <label htmlFor='claim-notes' className='text-sm font-medium text-text-primary'>
          Notes
        </label>
        <Textarea
          id='claim-notes'
          className='rounded-xl border-primary/20 bg-white'
          maxLength={NOTES_MAX_LENGTH}
          {...register('notes')}
          aria-invalid={Boolean(errors.notes)}
        />
        <p className='text-xs text-text-muted'>{NOTES_MAX_LENGTH_HELPER_TEXT}</p>
        {errors.notes ? <p className='text-xs text-destructive'>{errors.notes.message}</p> : null}
      </div>
    </>
  );
};
