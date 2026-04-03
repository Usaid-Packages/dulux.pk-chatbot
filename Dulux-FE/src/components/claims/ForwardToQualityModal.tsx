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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '#/components/ui';
import { forwardToQualitySchema, type ForwardToQualityFormValues } from '#/schemas/claim.schema';
import type { ClaimPriority } from '#/types/claims.types';

interface ForwardToQualityModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: ForwardToQualityFormValues) => void;
}

const PRIORITY_OPTIONS: ReadonlyArray<{ value: ClaimPriority; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
];

/**
 * ForwardToQualityModal gathers CS notes and priority before forwarding the claim.
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
    control,
    reset,
    formState: { errors },
  } = useForm<ForwardToQualityFormValues>({
    resolver: zodResolver(forwardToQualitySchema),
    defaultValues: {
      notes: '',
      priority: 'normal',
      verificationPackSummary: '',
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
          <DialogDescription>Add CS notes and assign priority for quality review.</DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={handleSubmit(handleFormSubmit)}>
          <div className='space-y-2'>
            <label htmlFor='forward-notes' className='text-sm font-medium text-text-primary'>
              CS Notes
            </label>
            <Textarea id='forward-notes' {...register('notes')} aria-invalid={Boolean(errors.notes)} />
            {errors.notes ? <p className='text-xs text-destructive'>{errors.notes.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='forward-priority' className='text-sm font-medium text-text-primary'>
              Priority
            </label>
            <Controller
              control={control}
              name='priority'
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='forward-priority'>
                    <SelectValue placeholder='Select priority' />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.priority ? <p className='text-xs text-destructive'>{errors.priority.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='verification-pack' className='text-sm font-medium text-text-primary'>
              Verification Pack Summary
            </label>
            <Input
              id='verification-pack'
              {...register('verificationPackSummary')}
              aria-invalid={Boolean(errors.verificationPackSummary)}
            />
            {errors.verificationPackSummary ? (
              <p className='text-xs text-destructive'>{errors.verificationPackSummary.message}</p>
            ) : null}
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
