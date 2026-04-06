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
import { qualityApproveSchema, type QualityApproveFormValues } from '#/schemas/quality.schema';
import { QUALITY_ASSESSMENTS } from './constants';

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
    control,
    reset,
    formState: { errors },
  } = useForm<QualityApproveFormValues>({
    resolver: zodResolver(qualityApproveSchema),
    defaultValues: {
      assessment: '',
      notes: '',
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Claim (Quality)</DialogTitle>
          <DialogDescription>Select a technical assessment and optional notes.</DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='space-y-2'>
            <label htmlFor='qa-assessment' className='text-sm font-medium text-text-primary'>
              Technical Assessment
            </label>
            <Controller
              control={control}
              name='assessment'
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='qa-assessment'>
                    <SelectValue placeholder='Select assessment' />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_ASSESSMENTS.map(assessment => (
                      <SelectItem key={assessment} value={assessment}>
                        {assessment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.assessment ? <p className='text-xs text-destructive'>{errors.assessment.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='qa-approval-notes' className='text-sm font-medium text-text-primary'>
              Technical Notes (Optional)
            </label>
            <Textarea id='qa-approval-notes' {...register('notes')} aria-invalid={Boolean(errors.notes)} />
            {errors.notes ? <p className='text-xs text-destructive'>{errors.notes.message}</p> : null}
          </div>

          <div className='rounded-md border border-border bg-surface-muted p-3'>
            <p className='text-xs font-semibold uppercase tracking-wide text-text-muted'>Outcome Summary</p>
            <p className='mt-1 text-sm text-text-primary'>
              This claim will move to approved state with QA decision history recorded.
            </p>
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Approve Claim'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
