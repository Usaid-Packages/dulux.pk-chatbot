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
import { NOTES_MAX_LENGTH, NOTES_MAX_LENGTH_HELPER_TEXT } from '#/constants';
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
      technicalReason: 'INSUFFICIENT_EVIDENCE',
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
      <DialogContent className='flex max-h-[80vh] flex-col overflow-hidden border-primary/20 bg-white sm:max-w-[700px]'>
        <DialogHeader>
          <DialogTitle>Reject Claim (Quality)</DialogTitle>
          <DialogDescription>Provide technical reason and notes before rejection.</DialogDescription>
        </DialogHeader>

        <form className='flex min-h-0 flex-1 flex-col' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
            <div className='space-y-2'>
              <label htmlFor='qa-reject-reason' className='text-sm font-medium text-text-primary'>
                Technical Rejection Reason
              </label>
              <Controller
                control={control}
                name='technicalReason'
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id='qa-reject-reason'>
                      <SelectValue placeholder='Select reason' />
                    </SelectTrigger>
                    <SelectContent>
                      {QUALITY_REJECTION_REASONS.map(reason => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.technicalReason ? (
                <p className='text-xs text-destructive'>{errors.technicalReason.message}</p>
              ) : null}
            </div>

            <div className='space-y-2'>
              <label htmlFor='qa-technical-notes' className='text-sm font-medium text-text-primary'>
                Technical Notes
              </label>
              <Textarea
                id='qa-technical-notes'
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
          </div>

          <DialogFooter className='mt-3 border-t border-primary/10 pt-3'>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type='submit' variant='destructive' className='rounded-xl' disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Reject Claim'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
