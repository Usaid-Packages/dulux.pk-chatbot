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
import { useDialogLifecycle } from '#/hooks/common/useDialogLifecycle';
import { rejectClaimFinalSchema, type RejectClaimFinalFormValues } from '#/schemas/claim.schema';
import type { ClaimDetail } from '#/types/claims.types';
import { createClaimRejectedTemplate } from '#/utils';

interface RejectClaimModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  claim: ClaimDetail;
  onClose: () => void;
  onSubmit: (values: RejectClaimFinalFormValues) => void;
}

/**
 * RejectClaimModal captures reason and optional notes for claim rejection.
 *
 * @param props - Modal state and submit callback.
 * @returns Reject modal.
 */
export const RejectClaimModal = ({
  isOpen,
  isSubmitting,
  claim,
  onClose,
  onSubmit,
}: RejectClaimModalProps): JSX.Element => {
  const {
    handleSubmit,
    register,
    reset,
    watch,
    formState: { errors },
  } = useForm<RejectClaimFinalFormValues>({
    resolver: zodResolver(rejectClaimFinalSchema),
    defaultValues: {
      notes: '',
    },
  });

  const notes = watch('notes') ?? '';
  const previewHtml = createClaimRejectedTemplate(claim, notes.trim() || 'Claim rejected after final review.');

  const { handleDialogOpenChange } = useDialogLifecycle({
    onClose,
    onReset: reset,
  });

  const handleFormSubmit = (values: RejectClaimFinalFormValues): void => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className='border-primary/20 bg-white'>
        <DialogHeader>
          <DialogTitle>Final Reject Claim</DialogTitle>
          <DialogDescription>Add final notes and review the customer email template.</DialogDescription>
        </DialogHeader>

        <form className='flex min-h-0 flex-1 flex-col space-y-4' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='space-y-2'>
            <label htmlFor='reject-notes' className='text-sm font-medium text-text-primary'>
              Final Rejection Notes
            </label>
            <Textarea
              id='reject-notes'
              className='rounded-xl border-primary/20 bg-white'
              maxLength={NOTES_MAX_LENGTH}
              {...register('notes')}
              aria-invalid={Boolean(errors.notes)}
            />
            <p className='text-xs text-text-muted'>{NOTES_MAX_LENGTH_HELPER_TEXT}</p>
            {errors.notes ? <p className='text-xs text-destructive'>{errors.notes.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <p className='text-sm font-medium text-text-primary'>Email Preview</p>
            <p className='text-xs text-text-muted'>This is the customer email template sent on final rejection.</p>
            <div className='overflow-hidden rounded-xl border border-primary/15 bg-white'>
              <iframe title='Claim rejection email preview' className='h-56 w-full' sandbox='' srcDoc={previewHtml} />
            </div>
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type='submit' variant='destructive' className='rounded-xl' disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Final Reject Claim'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
