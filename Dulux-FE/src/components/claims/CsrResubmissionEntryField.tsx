import type { JSX } from 'react';
import { useRef } from 'react';

import { Controller } from 'react-hook-form';
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';

import { Button, Input, Textarea } from '#/components/ui';
import type { ClaimCsrResubmissionFormValues } from '#/schemas/claim.schema';
import type { ClaimCsrResubmissionRequestedItem } from '#/types/claims.types';

interface CsrResubmissionEntryFieldProps {
  control: Control<ClaimCsrResubmissionFormValues>;
  errors: FieldErrors<ClaimCsrResubmissionFormValues>;
  index: number;
  register: UseFormRegister<ClaimCsrResubmissionFormValues>;
  requestedItem: ClaimCsrResubmissionRequestedItem;
}

/**
 * CsrResubmissionEntryField renders one requested item entry in CSR resubmission flow.
 *
 * @param props - Form bindings and requested-item descriptor.
 * @returns Requested-item response input block.
 */
export const CsrResubmissionEntryField = ({
  control,
  errors,
  index,
  register,
  requestedItem,
}: CsrResubmissionEntryFieldProps): JSX.Element => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const responseTextError = errors.entries?.[index]?.responseText?.message;
  const imageFileError = errors.entries?.[index]?.imageFile?.message;

  return (
    <article className='space-y-2 rounded-xl border border-primary/15 bg-white/90 p-3'>
      <header>
        <p className='text-sm font-semibold text-text-primary'>{requestedItem.label}</p>
        <p className='text-xs text-text-muted'>
          {requestedItem.inputType === 'IMAGE' ? 'Upload image evidence.' : 'Provide the required details.'}
          {requestedItem.isMultiple ? ' Multiple uploads may be accepted by backend.' : ''}
        </p>
      </header>

      <input type='hidden' {...register(`entries.${index}.requiredItem`)} />
      <input type='hidden' {...register(`entries.${index}.inputType`)} />

      {requestedItem.inputType === 'TEXT' ? (
        <div className='space-y-1'>
          <Textarea
            rows={3}
            className='rounded-xl border-primary/20 bg-white'
            placeholder='Enter customer response...'
            {...register(`entries.${index}.responseText`)}
          />
          {responseTextError ? <p className='text-xs text-destructive'>{responseTextError}</p> : null}
        </div>
      ) : (
        <Controller
          name={`entries.${index}.imageFile`}
          control={control}
          render={({ field }) => {
            const selectedFileName = field.value?.name;

            return (
              <div className='space-y-1'>
                <Input
                  ref={inputRef}
                  type='file'
                  className='sr-only'
                  accept='.jpg,.jpeg,.png,.webp'
                  onBlur={field.onBlur}
                  onChange={event => {
                    const selectedFile = event.target.files?.[0];
                    field.onChange(selectedFile);
                  }}
                />
                <Button
                  type='button'
                  variant='outline'
                  className='w-full justify-start rounded-xl border-primary/20 bg-white'
                  onClick={() => inputRef.current?.click()}
                >
                  {selectedFileName ? 'Change image' : 'Upload image'}
                </Button>
                {selectedFileName ? <p className='text-xs text-text-muted'>Selected: {selectedFileName}</p> : null}
                {imageFileError ? <p className='text-xs text-destructive'>{imageFileError}</p> : null}
              </div>
            );
          }}
        />
      )}
    </article>
  );
};
