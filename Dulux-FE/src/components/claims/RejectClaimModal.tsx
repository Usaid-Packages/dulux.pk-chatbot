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
import { rejectClaimSchema, type RejectClaimFormValues } from '#/schemas/claim.schema';
import { CLAIM_REJECTION_REASONS } from './constants';

interface RejectClaimModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: RejectClaimFormValues) => void;
}

/**
 * RejectClaimModal captures reason and optional notes for claim rejection.
 *
 * @param props - Modal state and submit callback.
 * @returns Reject modal.
 */
export const RejectClaimModal = ({ isOpen, isSubmitting, onClose, onSubmit }: RejectClaimModalProps): JSX.Element => {
  const {
    handleSubmit,
    register,
    control,
    reset,
    formState: { errors },
  } = useForm<RejectClaimFormValues>({
    resolver: zodResolver(rejectClaimSchema),
    defaultValues: {
      reason: '',
      notes: '',
    },
  });

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      reset();
      onClose();
    }
  };

  const handleFormSubmit = (values: RejectClaimFormValues): void => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className='border-primary/20 bg-[linear-gradient(170deg,#ffffff_0%,#f1f7ff_100%)]'>
        <DialogHeader>
          <DialogTitle>Reject Claim</DialogTitle>
          <DialogDescription>Provide a reason before rejecting this claim.</DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='space-y-2'>
            <label htmlFor='reject-reason' className='text-sm font-medium text-text-primary'>
              Reason
            </label>
            <Controller
              control={control}
              name='reason'
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='reject-reason'>
                    <SelectValue placeholder='Select reason' />
                  </SelectTrigger>
                  <SelectContent>
                    {CLAIM_REJECTION_REASONS.map(reason => (
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
            <label htmlFor='reject-notes' className='text-sm font-medium text-text-primary'>
              Notes (Optional)
            </label>
            <Textarea
              id='reject-notes'
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
            <Button type='submit' variant='destructive' className='rounded-xl' disabled={isSubmitting}>
              {isSubmitting ? 'Rejecting...' : 'Reject Claim'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
