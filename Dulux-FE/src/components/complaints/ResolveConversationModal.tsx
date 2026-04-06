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
  Textarea,
} from '#/components/ui';
import { resolveConversationSchema } from '#/schemas/complaints.schema';
import type { ResolveConversationFormValues } from '#/schemas/complaints.schema';

interface ResolveConversationModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: ResolveConversationFormValues) => void;
}

/**
 * ResolveConversationModal captures resolution details for closing a conversation.
 *
 * @param props - Modal state and submit callback.
 * @returns Resolve conversation modal.
 */
export const ResolveConversationModal = ({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: ResolveConversationModalProps): JSX.Element => {
  const {
    control,
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<ResolveConversationFormValues>({
    resolver: zodResolver(resolveConversationSchema),
    defaultValues: {
      resolutionType: 'issueResolved',
      summary: '',
      notifyCustomer: true,
    },
  });

  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Conversation</DialogTitle>
          <DialogDescription>Mark this conversation as resolved and notify customer.</DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={handleSubmit(onSubmit)}>
          <div className='space-y-2'>
            <p className='text-sm font-medium text-text-primary'>Resolution Type</p>
            <Controller
              name='resolutionType'
              control={control}
              render={({ field }) => {
                const handleIssueResolved = (): void => field.onChange('issueResolved');
                const handleNeedFollowUp = (): void => field.onChange('needQualityFollowUp');

                return (
                  <div className='space-y-2 rounded-md border border-border p-3'>
                    <label className='flex items-center gap-2 text-sm text-text-primary'>
                      <input
                        type='radio'
                        checked={field.value === 'issueResolved'}
                        onChange={handleIssueResolved}
                        className='h-4 w-4'
                      />
                      Issue Resolved
                    </label>
                    <label className='flex items-center gap-2 text-sm text-text-primary'>
                      <input
                        type='radio'
                        checked={field.value === 'needQualityFollowUp'}
                        onChange={handleNeedFollowUp}
                        className='h-4 w-4'
                      />
                      Needs Quality Follow-up
                    </label>
                  </div>
                );
              }}
            />
          </div>

          <div className='space-y-2'>
            <label htmlFor='resolve-summary' className='text-sm font-medium text-text-primary'>
              Resolution Summary
            </label>
            <Textarea id='resolve-summary' {...register('summary')} aria-invalid={Boolean(errors.summary)} />
            {errors.summary ? <p className='text-xs text-destructive'>{errors.summary.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <Controller
              name='notifyCustomer'
              control={control}
              render={({ field }) => {
                const handleToggle = (): void => field.onChange(!field.value);

                return (
                  <label className='flex items-center gap-2 text-sm text-text-primary'>
                    <input type='checkbox' checked={field.value} onChange={handleToggle} className='h-4 w-4 rounded' />
                    Send resolution update to customer
                  </label>
                );
              }}
            />
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Mark as Resolved'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
