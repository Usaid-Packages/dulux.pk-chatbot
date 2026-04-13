import type { JSX } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

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
import { qualityApproveSchema, type QualityApproveFormValues } from '#/schemas/quality.schema';

interface ApproveClaimModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: QualityApproveFormValues) => void;
}

/**
 * ApproveClaimModal captures QA technical assessment and approval notes.
 *
 * @param props - Modal open state and submit handler.
 * @returns QA approve modal.
 */
export const ApproveClaimModal = ({ isOpen, isSubmitting, onClose, onSubmit }: ApproveClaimModalProps): JSX.Element => {
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<QualityApproveFormValues>({
    resolver: zodResolver(qualityApproveSchema),
    defaultValues: {
      technicalNotes: '',
    },
  });

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      reset();
      onClose();
    }
  };

  const handleFormSubmit = (values: QualityApproveFormValues): void => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className='flex max-h-[80vh] flex-col overflow-hidden border-primary/20 bg-white sm:max-w-[700px]'>
        <DialogHeader>
          <DialogTitle>Approve Claim (Quality)</DialogTitle>
          <DialogDescription>Provide technical notes before QA approval.</DialogDescription>
        </DialogHeader>

        <form className='flex min-h-0 flex-1 flex-col' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
            <div className='space-y-2'>
              <label htmlFor='qa-approval-notes' className='text-sm font-medium text-text-primary'>
                Technical Notes
              </label>
              <Textarea
                id='qa-approval-notes'
                className='rounded-xl border-primary/20 bg-white'
                maxLength={NOTES_MAX_LENGTH}
                {...register('technicalNotes')}
                aria-invalid={Boolean(errors.technicalNotes)}
              />
              <p className='text-xs text-text-muted'>{NOTES_MAX_LENGTH_HELPER_TEXT}</p>
              {errors.technicalNotes ? (
                <p className='text-xs text-destructive'>{errors.technicalNotes.message}</p>
              ) : null}
            </div>

            <div className='rounded-xl border border-primary/20 bg-primary/5 p-3'>
              <p className='text-xs font-semibold uppercase tracking-wide text-text-muted'>Outcome Summary</p>
              <p className='mt-1 text-sm text-text-primary'>
                This claim will move to approved state with QA decision history recorded.
              </p>
            </div>
          </div>

          <DialogFooter className='mt-3 border-t border-primary/10 pt-3'>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type='submit'
              className='rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white hover:brightness-105'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Approve Claim'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
