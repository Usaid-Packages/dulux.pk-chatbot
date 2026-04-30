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
import { forwardToQualitySchema, type ForwardToQualityFormValues } from '#/schemas/claim.schema';

interface ForwardToQualityModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: ForwardToQualityFormValues) => void;
}

/**
 * ForwardToQualityModal gathers notes before forwarding the claim.
 *
 * @param props - Modal state and submit callback.
 * @returns Forward modal.
 */
export const ForwardToQualityModal = ({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: ForwardToQualityModalProps): JSX.Element => {
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<ForwardToQualityFormValues>({
    resolver: zodResolver(forwardToQualitySchema),
    defaultValues: {
      notes: '',
    },
  });

  const { handleDialogOpenChange } = useDialogLifecycle({
    onClose,
    onReset: reset,
  });

  const handleFormSubmit = (values: ForwardToQualityFormValues): void => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className='border-primary/20 bg-white'>
        <DialogHeader>
          <DialogTitle>Forward Claim To Quality</DialogTitle>
          <DialogDescription>Add note for quality review.</DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='space-y-2'>
            <label htmlFor='forward-notes' className='text-sm font-medium text-text-primary'>
              Note
            </label>
            <Textarea
              id='forward-notes'
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
            <Button type='submit' variant='primaryGradient' className='rounded-xl' disabled={isSubmitting}>
              {isSubmitting ? 'Forwarding...' : 'Forward'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
