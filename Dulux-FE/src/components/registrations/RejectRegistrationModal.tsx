import type { JSX } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '#/components/ui';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/Select';
import { REJECT_REASONS } from '#/constants';
import { rejectSchema, type RejectFormValues } from '#/schemas/registrations';

interface RejectRegistrationModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: RejectFormValues) => void;
}

/**
 * RejectRegistrationModal captures required rejection metadata.
 *
 * @param props - Dialog visibility and submit handlers.
 * @returns Reject-registration modal component.
 */
export const RejectRegistrationModal = ({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: RejectRegistrationModalProps): JSX.Element => {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: {
      reason: '',
      notes: '',
    },
  });

  const handleModalClose = (): void => {
    reset();
    onClose();
  };

  const handleFormSubmit = (values: RejectFormValues): void => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className='border-primary/20 bg-[linear-gradient(170deg,#ffffff_0%,#f1f7ff_100%)]'>
        <DialogHeader>
          <DialogTitle>Reject Registration</DialogTitle>
          <DialogDescription>Provide a reason and notes so the customer understands what failed.</DialogDescription>
        </DialogHeader>
        <form className='space-y-4' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='space-y-2'>
            <label htmlFor='reject-reason' className='block text-sm font-medium text-text-primary'>
              Rejection reason
            </label>
            <Controller
              control={control}
              name='reason'
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='reject-reason' aria-label='Rejection reason'>
                    <SelectValue placeholder='Select reason' />
                  </SelectTrigger>
                  <SelectContent>
                    {REJECT_REASONS.map(reason => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.reason ? <p className='text-xs text-destructive'>{errors.reason.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='reject-notes' className='block text-sm font-medium text-text-primary'>
              Notes
            </label>
            <textarea
              id='reject-notes'
              rows={4}
              className='w-full rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm'
              placeholder='Describe what must be corrected...'
              {...register('notes')}
            />
            {errors.notes ? <p className='text-xs text-destructive'>{errors.notes.message}</p> : null}
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={handleModalClose}>
              Cancel
            </Button>
            <Button type='submit' variant='destructive' className='rounded-xl' disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Reject Registration'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
