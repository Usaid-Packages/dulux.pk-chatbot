/* eslint import/order: off */
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
import { qualityRejectSchema, type QualityRejectFormValues } from '#/schemas/quality.schema';
import { QUALITY_REJECTION_REASONS } from './constants';

interface RejectClaimQAModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: QualityRejectFormValues) => void;
}

/**
 * RejectClaimQAModal captures QA rejection reason and technical notes.
 *
 * @param props - Modal state and submit callback.
 * @returns QA reject modal.
 */
export const RejectClaimQAModal = ({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: RejectClaimQAModalProps): JSX.Element => {
  const {
    handleSubmit,
    register,
    control,
    reset,
    formState: { errors },
  } = useForm<QualityRejectFormValues>({
    resolver: zodResolver(qualityRejectSchema),
    defaultValues: {
      reason: '',
      technicalNotes: '',
    },
  });

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      reset();
      onClose();
    }
  };

  const handleFormSubmit = (values: QualityRejectFormValues): void => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Claim (Quality)</DialogTitle>
          <DialogDescription>Provide technical reason and notes before rejection.</DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='space-y-2'>
            <label htmlFor='qa-reject-reason' className='text-sm font-medium text-text-primary'>
              Technical Rejection Reason
            </label>
            <Controller
              control={control}
              name='reason'
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='qa-reject-reason'>
                    <SelectValue placeholder='Select reason' />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_REJECTION_REASONS.map(reason => (
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
            <label htmlFor='qa-technical-notes' className='text-sm font-medium text-text-primary'>
              Technical Notes
            </label>
            <Textarea
              id='qa-technical-notes'
              {...register('technicalNotes')}
              aria-invalid={Boolean(errors.technicalNotes)}
            />
            {errors.technicalNotes ? <p className='text-xs text-destructive'>{errors.technicalNotes.message}</p> : null}
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type='submit' variant='destructive' disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Reject Claim'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
