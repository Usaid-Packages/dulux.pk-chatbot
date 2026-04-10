import type { JSX } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '#/components/ui';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui';
import { Textarea } from '#/components/ui/Textarea';
import { approveSchema, type ApproveFormValues } from '#/schemas/registrations';
import type { RegistrationDetail } from '#/types/registrations';
import { createRegistrationApprovedTemplate } from '#/utils';

interface ApproveRegistrationModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  registration: RegistrationDetail;
  onClose: () => void;
  onSubmit: (values: ApproveFormValues) => void;
}

/**
 * ApproveRegistrationModal captures approval notes and shows email template preview.
 *
 * @param props - Dialog visibility, registration detail, and submit handlers.
 * @returns Approve-registration modal component.
 */
export const ApproveRegistrationModal = ({
  isOpen,
  isSubmitting,
  registration,
  onClose,
  onSubmit,
}: ApproveRegistrationModalProps): JSX.Element => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ApproveFormValues>({
    resolver: zodResolver(approveSchema),
    defaultValues: {
      notes: '',
    },
  });

  const notes = watch('notes') ?? '';
  const previewHtml = createRegistrationApprovedTemplate(registration, notes.trim() || 'Approval confirmed.');

  const handleModalClose = (): void => {
    reset();
    onClose();
  };

  const handleFormSubmit = (values: ApproveFormValues): void => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className='flex max-h-[80vh] flex-col overflow-hidden border-primary/20 bg-white sm:max-w-[680px]'>
        <DialogHeader>
          <DialogTitle>Approve Registration</DialogTitle>
          <DialogDescription>Add notes and review the email preview before approval.</DialogDescription>
        </DialogHeader>
        <form className='flex min-h-0 flex-1 flex-col' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
            <div className='space-y-2'>
              <label htmlFor='approve-notes' className='block text-sm font-medium text-text-primary'>
                Notes
              </label>
              <Textarea
                id='approve-notes'
                rows={4}
                placeholder='Add approval context for the customer...'
                {...register('notes')}
              />
              {errors.notes ? <p className='text-xs text-destructive'>{errors.notes.message}</p> : null}
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium text-text-primary'>Email Preview</p>
              <p className='text-xs text-text-muted'>This is the email template that will be sent to the customer.</p>
              <div className='overflow-hidden rounded-xl border border-primary/15 bg-white'>
                <iframe
                  title='Approval email template preview'
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
            <Button
              type='submit'
              className='rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white hover:brightness-105'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Approve Registration'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
