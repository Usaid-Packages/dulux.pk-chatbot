import type { JSX } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '#/components/ui';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui';
import { Textarea } from '#/components/ui/Textarea';
import { NOTES_MAX_LENGTH, RESUBMISSION_FIELDS } from '#/constants';
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
      notes: '',
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
      <DialogContent className='flex max-h-[78vh] flex-col overflow-hidden border-primary/20 bg-white sm:max-w-[520px]'>
        <DialogHeader>
          <DialogTitle>Request Resubmission</DialogTitle>
          <DialogDescription>Select the fields that need correction and add notes for the customer.</DialogDescription>
        </DialogHeader>
        <form className='flex min-h-0 flex-1 flex-col' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='min-h-0 flex-1 overflow-y-auto pr-1'>
            <fieldset className='space-y-2'>
              <legend className='text-sm font-semibold text-text-primary'>Fields to resubmit</legend>
              {RESUBMISSION_FIELDS.map(field => (
                <label
                  key={field.id}
                  className='flex cursor-pointer items-start gap-3 rounded-xl border border-primary/15 bg-white/85 p-2.5'
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
          </div>

          <div className='mt-3 border-t border-primary/10 pt-3'>
            <div className='space-y-2'>
              <label htmlFor='resubmission-note' className='block text-sm font-medium text-text-primary'>
                Note to Customer
              </label>
              <Textarea
                id='resubmission-note'
                rows={3}
                maxLength={NOTES_MAX_LENGTH}
                placeholder='Add a clear note for the customer...'
                {...register('notes')}
              />
              {errors.notes ? <p className='text-xs text-destructive'>{errors.notes.message}</p> : null}
            </div>
          </div>

          <DialogFooter className='mt-3 border-t border-primary/10 pt-3'>
            <Button type='button' variant='outline' onClick={handleModalClose}>
              Cancel
            </Button>
            <Button
              type='submit'
              className='rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white hover:brightness-105'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
