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
import { escalateConversationSchema } from '#/schemas/complaints.schema';
import type { EscalateConversationFormValues } from '#/schemas/complaints.schema';

interface EscalateConversationModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: EscalateConversationFormValues) => void;
}

const ESCALATION_REASONS = [
  'Technical complexity',
  'Policy exception',
  'Customer dissatisfaction',
  'Legal concern',
] as const;

/**
 * EscalateConversationModal captures escalation level and context.
 *
 * @param props - Modal state and submit callback.
 * @returns Escalation modal.
 */
export const EscalateConversationModal = ({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: EscalateConversationModalProps): JSX.Element => {
  const {
    control,
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<EscalateConversationFormValues>({
    resolver: zodResolver(escalateConversationSchema),
    defaultValues: {
      level: 'L1',
      reason: '',
      urgency: 'normal',
      description: '',
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
          <DialogTitle>Escalate Conversation</DialogTitle>
          <DialogDescription>Escalate this conversation to supervisor/management.</DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={handleSubmit(onSubmit)}>
          <div className='space-y-2'>
            <label htmlFor='escalation-level' className='text-sm font-medium text-text-primary'>
              Escalation Level
            </label>
            <Controller
              name='level'
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='escalation-level'>
                    <SelectValue placeholder='Select level' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='L1'>L1</SelectItem>
                    <SelectItem value='L2'>L2</SelectItem>
                    <SelectItem value='L3'>L3</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className='space-y-2'>
            <label htmlFor='escalation-reason' className='text-sm font-medium text-text-primary'>
              Escalation Reason
            </label>
            <Controller
              name='reason'
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='escalation-reason'>
                    <SelectValue placeholder='Select reason' />
                  </SelectTrigger>
                  <SelectContent>
                    {ESCALATION_REASONS.map(reason => (
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
            <label htmlFor='escalation-urgency' className='text-sm font-medium text-text-primary'>
              Urgency
            </label>
            <Controller
              name='urgency'
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='escalation-urgency'>
                    <SelectValue placeholder='Select urgency' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='normal'>Normal</SelectItem>
                    <SelectItem value='high'>High</SelectItem>
                    <SelectItem value='critical'>Critical</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className='space-y-2'>
            <label htmlFor='escalation-description' className='text-sm font-medium text-text-primary'>
              Description
            </label>
            <Textarea
              id='escalation-description'
              {...register('description')}
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description ? <p className='text-xs text-destructive'>{errors.description.message}</p> : null}
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Escalating...' : 'Escalate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
