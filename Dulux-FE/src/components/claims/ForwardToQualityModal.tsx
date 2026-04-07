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
import { forwardToQualitySchema, type ForwardToQualityFormValues } from '#/schemas/claim.schema';

interface ForwardToQualityModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: ForwardToQualityFormValues) => void;
}

/**
 * ForwardToQualityModal gathers CS notes before forwarding the claim.
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

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      reset();
      onClose();
    }
  };

  const handleFormSubmit = (values: ForwardToQualityFormValues): void => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Forward Claim To Quality</DialogTitle>
          <DialogDescription>Add CS notes for quality review.</DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='space-y-2'>
            <label htmlFor='forward-notes' className='text-sm font-medium text-text-primary'>
              CS Notes
            </label>
            <Textarea id='forward-notes' {...register('notes')} aria-invalid={Boolean(errors.notes)} />
            {errors.notes ? <p className='text-xs text-destructive'>{errors.notes.message}</p> : null}
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Forwarding...' : 'Forward'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
