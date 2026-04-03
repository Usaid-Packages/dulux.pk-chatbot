import type { JSX } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '#/components/ui';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui';
import { RESUBMISSION_FIELDS } from '#/constants';
import { resubmissionSchema, type ResubmissionFormValues } from '#/schemas/registrations';

interface ResubmissionModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: ResubmissionFormValues) => void;
}

/**
 * ResubmissionModal collects field-level resubmission requests.
 *
 * @param props - Dialog visibility and submit handlers.
 * @returns Resubmission modal component.
 */
export const ResubmissionModal = ({ isOpen, isSubmitting, onClose, onSubmit }: ResubmissionModalProps): JSX.Element => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResubmissionFormValues>({
    resolver: zodResolver(resubmissionSchema),
    defaultValues: {
      fields: [],
      note: '',
    },
  });

  const handleModalClose = (): void => {
    reset();
    onClose();
  };

  const handleFormSubmit = (values: ResubmissionFormValues): void => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Resubmission</DialogTitle>
          <DialogDescription>Select the fields that need correction and add notes for the customer.</DialogDescription>
        </DialogHeader>
        <form className='space-y-4' onSubmit={handleSubmit(handleFormSubmit)}>
          <fieldset className='space-y-2'>
            <legend className='text-sm font-semibold text-text-primary'>Fields to resubmit</legend>
            {RESUBMISSION_FIELDS.map(field => (
              <label
                key={field.id}
                className='flex cursor-pointer items-start gap-3 rounded-md border border-border p-2'
              >
                <input type='checkbox' className='mt-1' value={field.id} {...register('fields')} />
                <span>
                  <span className='block text-sm font-medium text-text-primary'>{field.label}</span>
                  <span className='block text-xs text-text-muted'>{field.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {errors.fields ? <p className='text-xs text-destructive'>{errors.fields.message}</p> : null}
          <div className='space-y-2'>
            <label htmlFor='resubmission-note' className='block text-sm font-medium text-text-primary'>
              Note (optional)
            </label>
            <textarea
              id='resubmission-note'
              rows={4}
              className='w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm'
              placeholder='Add context for the customer...'
              {...register('note')}
            />
            {errors.note ? <p className='text-xs text-destructive'>{errors.note.message}</p> : null}
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={handleModalClose}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
