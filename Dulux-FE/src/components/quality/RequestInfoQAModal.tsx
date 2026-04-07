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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '#/components/ui';
import { qualityRequestInfoSchema, type QualityRequestInfoFormValues } from '#/schemas/quality.schema';
import type { QualityRequestFrom } from '#/types/quality.types';
import { QUALITY_REQUEST_INFO_ITEMS } from './constants';

interface RequestInfoQAModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: QualityRequestInfoFormValues) => void;
}

const REQUEST_FROM_OPTIONS: ReadonlyArray<{ value: QualityRequestFrom; label: string }> = [
  { value: 'cs_agent', label: 'CS Agent' },
  { value: 'customer', label: 'Customer' },
];

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
    formState: { errors },
  } = useForm<QualityRequestInfoFormValues>({
    resolver: zodResolver(qualityRequestInfoSchema),
    defaultValues: {
      items: [],
      notes: '',
      requestFrom: 'cs_agent',
    },
  });

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
      <DialogContent className='border-primary/20 bg-[linear-gradient(170deg,#ffffff_0%,#f1f7ff_100%)]'>
        <DialogHeader>
          <DialogTitle>Request More Info (Quality)</DialogTitle>
          <DialogDescription>Select missing evidence and who should provide it.</DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='space-y-2'>
            <p className='text-sm font-medium text-text-primary'>Required items</p>
            <Controller
              control={control}
              name='items'
              render={({ field }) => (
                <div className='space-y-2 rounded-xl border border-primary/15 bg-white/85 p-3'>
                  {QUALITY_REQUEST_INFO_ITEMS.map(item => {
                    const checkboxId = `qa-request-item-${item.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
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
            <label htmlFor='qa-request-from' className='text-sm font-medium text-text-primary'>
              Request From
            </label>
            <Controller
              control={control}
              name='requestFrom'
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='qa-request-from'>
                    <SelectValue placeholder='Select source' />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_FROM_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.requestFrom ? <p className='text-xs text-destructive'>{errors.requestFrom.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='qa-request-notes' className='text-sm font-medium text-text-primary'>
              Notes (Optional)
            </label>
            <Textarea
              id='qa-request-notes'
              className='rounded-xl border-primary/20 bg-white'
              {...register('notes')}
              aria-invalid={Boolean(errors.notes)}
            />
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
