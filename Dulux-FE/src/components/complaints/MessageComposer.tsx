import type { JSX } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button, Textarea } from '#/components/ui';
import { sendMessageSchema } from '#/schemas/complaints.schema';
import type { SendMessageFormValues } from '#/schemas/complaints.schema';

interface MessageComposerProps {
  isSubmitting: boolean;
  onSubmit: (message: string) => void;
}

/**
 * MessageComposer renders a validated chat message input.
 *
 * @param props - Submit handlers and loading state.
 * @returns Message composer.
 */
export const MessageComposer = ({ isSubmitting, onSubmit }: MessageComposerProps): JSX.Element => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SendMessageFormValues>({
    resolver: zodResolver(sendMessageSchema),
    defaultValues: {
      message: '',
    },
  });

  const submitHandler = (values: SendMessageFormValues): void => {
    onSubmit(values.message);
    reset({ message: '' });
  };

  return (
    <form onSubmit={handleSubmit(submitHandler)} className='space-y-2 border-t border-primary/15 bg-surface p-3'>
      <Textarea
        rows={3}
        className='rounded-xl border-primary/20 bg-white'
        placeholder='Write message for customer...'
        aria-label='Message input'
        {...register('message')}
      />

      {errors.message ? <p className='text-xs text-destructive'>{errors.message.message}</p> : null}

      <div className='flex justify-end'>
        <Button type='submit' variant='primaryGradient' className='rounded-xl' disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </Button>
      </div>
    </form>
  );
};
