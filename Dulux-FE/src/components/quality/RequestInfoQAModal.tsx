import type { JSX } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '#/components/ui';
import { NOTES_MAX_LENGTH, NOTES_MAX_LENGTH_HELPER_TEXT } from '#/constants';
import { qualityRequestInfoSchema, type QualityRequestInfoFormValues } from '#/schemas/quality.schema';
import { QUALITY_REQUEST_INFO_ITEMS } from './constants';

interface RequestInfoQAModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: QualityRequestInfoFormValues) => void;
}

/**
 * RequestInfoQAModal captures QA follow-up items and the request target.
 *
 * @param props - Modal state and submit callback.
 * @returns QA request-info modal.
 */
export const RequestInfoQAModal = ({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: RequestInfoQAModalProps): JSX.Element => {
  const {
    handleSubmit,
    register,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<QualityRequestInfoFormValues>({
    resolver: zodResolver(qualityRequestInfoSchema),
    defaultValues: {
      requiredItems: [],
      notes: '',
      otherText: '',
    },
  });

  const selectedRequiredItems = watch('requiredItems');
  const isOtherSelected = selectedRequiredItems.includes('OTHER');

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      reset();
      onClose();
    }
  };

  const handleFormSubmit = (values: QualityRequestInfoFormValues): void => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className='border-primary/20 bg-white'>
        <DialogHeader>
          <DialogTitle>Request More Info (Quality)</DialogTitle>
          <DialogDescription>Select missing evidence required for technical review.</DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='space-y-2'>
            <p className='text-sm font-medium text-text-primary'>Required items</p>
            <Controller
              control={control}
              name='requiredItems'
              render={({ field }) => (
                <div className='space-y-2 rounded-xl border border-primary/15 bg-white/85 p-3'>
                  {QUALITY_REQUEST_INFO_ITEMS.map(item => {
                    const checkboxId = `qa-request-item-${item.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                    const checked = field.value.includes(item.value);

                    const handleCheckedChange = (): void => {
                      if (checked) {
                        field.onChange(field.value.filter(value => value !== item.value));
                        return;
                      }

                      field.onChange([...field.value, item.value]);
                    };

                    return (
                      <div key={item.value} className='flex items-start gap-2'>
                        <input
                          id={checkboxId}
                          type='checkbox'
                          checked={checked}
                          onChange={handleCheckedChange}
                          className='mt-1 h-4 w-4 rounded border-border'
                        />
                        <label htmlFor={checkboxId} className='text-sm text-text-primary'>
                          {item.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            />
            {errors.requiredItems ? <p className='text-xs text-destructive'>{errors.requiredItems.message}</p> : null}
          </div>

          {isOtherSelected ? (
            <div className='space-y-2'>
              <label htmlFor='qa-request-other-text' className='text-sm font-medium text-text-primary'>
                Other Details
              </label>
              <Textarea
                id='qa-request-other-text'
                className='rounded-xl border-primary/20 bg-white'
                {...register('otherText')}
                aria-invalid={Boolean(errors.otherText)}
              />
              {errors.otherText ? <p className='text-xs text-destructive'>{errors.otherText.message}</p> : null}
            </div>
          ) : null}

          <div className='space-y-2'>
            <label htmlFor='qa-request-notes' className='text-sm font-medium text-text-primary'>
              Notes (Optional)
            </label>
            <Textarea
              id='qa-request-notes'
              className='rounded-xl border-primary/20 bg-white'
              maxLength={NOTES_MAX_LENGTH}
              {...register('notes')}
              aria-invalid={Boolean(errors.notes)}
            />
            <p className='text-xs text-text-muted'>{NOTES_MAX_LENGTH_HELPER_TEXT}</p>
            {errors.notes ? <p className='text-xs text-destructive'>{errors.notes.message}</p> : null}
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type='submit'
              className='rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white hover:brightness-105'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Request Info'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
