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
import { requestMoreInfoSchema, type RequestMoreInfoFormValues } from '#/schemas/claim.schema';
import { REQUEST_INFO_ITEMS } from './constants';

interface RequestMoreInfoModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: RequestMoreInfoFormValues) => void;
}

/**
 * RequestMoreInfoModal captures requested evidence and follow-up context.
 *
 * @param props - Modal state and submit callback.
 * @returns Request more info modal.
 */
export const RequestMoreInfoModal = ({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: RequestMoreInfoModalProps): JSX.Element => {
  const {
    handleSubmit,
    register,
    control,
    reset,
    formState: { errors },
  } = useForm<RequestMoreInfoFormValues>({
    resolver: zodResolver(requestMoreInfoSchema),
    defaultValues: {
      items: [],
      note: '',
    },
  });

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      reset();
      onClose();
    }
  };

  const handleFormSubmit = (values: RequestMoreInfoFormValues): void => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className='border-primary/20 bg-white'>
        <DialogHeader>
          <DialogTitle>Request More Information</DialogTitle>
          <DialogDescription>Select missing items and add context for the customer.</DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='space-y-2'>
            <p className='text-sm font-medium text-text-primary'>Requested items</p>
            <Controller
              control={control}
              name='items'
              render={({ field }) => (
                <div className='space-y-2 rounded-xl border border-primary/15 bg-white/85 p-3'>
                  {REQUEST_INFO_ITEMS.map(item => {
                    const checkboxId = `request-info-${item.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                    const checked = field.value.includes(item);

                    const handleCheckedChange = (): void => {
                      if (checked) {
                        field.onChange(field.value.filter(value => value !== item));
                        return;
                      }

                      field.onChange([...field.value, item]);
                    };

                    return (
                      <div key={item} className='flex items-start gap-2'>
                        <input
                          id={checkboxId}
                          type='checkbox'
                          checked={checked}
                          onChange={handleCheckedChange}
                          className='mt-1 h-4 w-4 rounded border-border'
                        />
                        <label htmlFor={checkboxId} className='text-sm text-text-primary'>
                          {item}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            />
            {errors.items ? <p className='text-xs text-destructive'>{errors.items.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='request-note' className='text-sm font-medium text-text-primary'>
              Note (Optional)
            </label>
            <Textarea
              id='request-note'
              className='rounded-xl border-primary/20 bg-white'
              maxLength={NOTES_MAX_LENGTH}
              {...register('note')}
              aria-invalid={Boolean(errors.note)}
            />
            <p className='text-xs text-text-muted'>{NOTES_MAX_LENGTH_HELPER_TEXT}</p>
            {errors.note ? <p className='text-xs text-destructive'>{errors.note.message}</p> : null}
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
