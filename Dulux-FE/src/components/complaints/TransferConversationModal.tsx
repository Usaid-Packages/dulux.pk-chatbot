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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '#/components/ui';
import { transferConversationSchema } from '#/schemas/complaints.schema';
import type { TransferConversationFormValues } from '#/schemas/complaints.schema';

interface TransferConversationModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: TransferConversationFormValues) => void;
}

const AGENT_OPTIONS = [
  { id: 'agent-amina', label: 'Amina Khan' },
  { id: 'agent-kamran', label: 'Kamran Malik' },
  { id: 'agent-nadia', label: 'Nadia Qureshi' },
] as const;

const TRANSFER_REASONS = ['Workload balancing', 'Skill mismatch', 'Escalation required', 'Shift handover'] as const;

/**
 * TransferConversationModal captures transfer target and reason.
 *
 * @param props - Modal state and submit callback.
 * @returns Transfer modal.
 */
export const TransferConversationModal = ({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: TransferConversationModalProps): JSX.Element => {
  const {
    control,
    register,
    watch,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<TransferConversationFormValues>({
    resolver: zodResolver(transferConversationSchema),
    defaultValues: {
      transferTo: 'agent',
      agentId: AGENT_OPTIONS[0]?.label,
      queueName: '',
      reason: '',
      internalNote: '',
      ccCurrentAgent: false,
    },
  });

  const transferTo = watch('transferTo');

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
          <DialogTitle>Transfer Conversation</DialogTitle>
          <DialogDescription>Transfer this conversation to another agent or queue.</DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={handleSubmit(onSubmit)}>
          <div className='space-y-2'>
            <label htmlFor='transfer-target' className='text-sm font-medium text-text-primary'>
              Transfer To
            </label>
            <Controller
              name='transferTo'
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='transfer-target'>
                    <SelectValue placeholder='Choose transfer target' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='agent'>Agent</SelectItem>
                    <SelectItem value='queue'>Queue</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {transferTo === 'agent' ? (
            <div className='space-y-2'>
              <label htmlFor='transfer-agent' className='text-sm font-medium text-text-primary'>
                Assign To Agent
              </label>
              <Controller
                name='agentId'
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id='transfer-agent'>
                      <SelectValue placeholder='Select agent' />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENT_OPTIONS.map(agent => (
                        <SelectItem key={agent.id} value={agent.label}>
                          {agent.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.agentId ? <p className='text-xs text-destructive'>{errors.agentId.message}</p> : null}
            </div>
          ) : (
            <div className='space-y-2'>
              <label htmlFor='transfer-queue' className='text-sm font-medium text-text-primary'>
                Queue Name
              </label>
              <Input id='transfer-queue' {...register('queueName')} aria-invalid={Boolean(errors.queueName)} />
              {errors.queueName ? <p className='text-xs text-destructive'>{errors.queueName.message}</p> : null}
            </div>
          )}

          <div className='space-y-2'>
            <label htmlFor='transfer-reason' className='text-sm font-medium text-text-primary'>
              Transfer Reason
            </label>
            <Controller
              name='reason'
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='transfer-reason'>
                    <SelectValue placeholder='Select reason' />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSFER_REASONS.map(reason => (
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
            <label htmlFor='transfer-note' className='text-sm font-medium text-text-primary'>
              Internal Note (Optional)
            </label>
            <Textarea id='transfer-note' {...register('internalNote')} aria-invalid={Boolean(errors.internalNote)} />
            {errors.internalNote ? <p className='text-xs text-destructive'>{errors.internalNote.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <Controller
              name='ccCurrentAgent'
              control={control}
              render={({ field }) => {
                const handleToggle = (): void => field.onChange(!field.value);

                return (
                  <label className='flex items-center gap-2 text-sm text-text-primary'>
                    <input type='checkbox' checked={field.value} onChange={handleToggle} className='h-4 w-4 rounded' />
                    CC current assigned agent
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
              {isSubmitting ? 'Transferring...' : 'Transfer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
