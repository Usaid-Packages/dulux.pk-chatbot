import type { JSX } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '#/components/ui';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui';
import { Textarea } from '#/components/ui/Textarea';
import { NOTES_MAX_LENGTH } from '#/constants';
import { rejectSchema, type RejectFormValues } from '#/schemas/registrations';
import type { RegistrationDetail } from '#/types/registrations';
import { createRegistrationRejectedTemplate } from '#/utils';

interface RejectRegistrationModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  registration: RegistrationDetail;
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
  registration,
  onClose,
  onSubmit,
}: RejectRegistrationModalProps): JSX.Element => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: {
      notes: '',
    },
  });

  const notes = watch('notes') ?? '';
  const previewHtml = createRegistrationRejectedTemplate(registration, notes.trim() || 'Rejected after review.');

  const handleModalClose = (): void => {
    reset();
    onClose();
  };

  const handleFormSubmit = (values: RejectFormValues): void => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className='flex max-h-[80vh] flex-col overflow-hidden border-primary/20 bg-white sm:max-w-[680px]'>
        <DialogHeader>
          <DialogTitle>Reject Registration</DialogTitle>
          <DialogDescription>
            Provide notes for the customer explaining why this registration was rejected.
          </DialogDescription>
        </DialogHeader>
        <form className='flex min-h-0 flex-1 flex-col' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
            <div className='space-y-2'>
              <label htmlFor='reject-notes' className='block text-sm font-medium text-text-primary'>
                Notes
              </label>
              <Textarea
                id='reject-notes'
                rows={4}
                maxLength={NOTES_MAX_LENGTH}
                placeholder='Describe what must be corrected...'
                {...register('notes')}
              />
              {errors.notes ? <p className='text-xs text-destructive'>{errors.notes.message}</p> : null}
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium text-text-primary'>Email Preview</p>
              <p className='text-xs text-text-muted'>This is the email template that will be sent to the customer.</p>
              <div className='overflow-hidden rounded-xl border border-primary/15 bg-white'>
                <iframe
                  title='Rejection email template preview'
                  className='h-60 w-full'
                  sandbox=''
                  srcDoc={previewHtml}
                />
              </div>
            </div>
          </div>

          <DialogFooter className='mt-3 border-t border-primary/10 pt-3'>
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
