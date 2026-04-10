import type { JSX } from 'react';
import { useEffect, useRef } from 'react';

import { Badge, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import { COMPLAINT_API_STATUSES } from '#/types/complaints';
import type { ConversationThread } from '#/types/complaints';
import { cn } from '#/utils';
import { CONVERSATION_CHANNEL_LABELS, CONVERSATION_STATUS_CLASSNAMES, CONVERSATION_STATUS_LABELS } from './constants';
import { MessageComposer } from './MessageComposer';

interface ChatThreadPanelProps {
  thread?: ConversationThread;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  isSending: boolean;
  onSendMessage: (message: string) => void;
}

const formatTime = (isoDateTime: string): string => {
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  }).format(parsed);
};

const containsReadableText = (value: string): boolean => {
  return /[A-Za-z]/.test(value);
};

/**
 * ChatThreadPanel renders selected conversation messages and message composer.
 *
 * @param props - Selected thread state and send handler.
 * @returns Thread panel.
 */
export const ChatThreadPanel = ({
  thread,
  isLoading,
  isError,
  errorMessage,
  isSending,
  onSendMessage,
}: ChatThreadPanelProps): JSX.Element => {
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const threadTitle = thread
    ? containsReadableText(thread.customerName)
      ? thread.customerName
      : `Ticket #${thread.ticketId}`
    : '';

  useEffect(() => {
    if (!messageListRef.current) {
      return;
    }

    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [thread?.messages]);

  if (isLoading) {
    return (
      <section className='wf-card wf-card-p4 border-primary/15 bg-white/95'>
        <Skeleton className='h-8 w-1/2' />
        <div className='mt-4 space-y-3'>
          <Skeleton className='h-16 w-2/3' />
          <Skeleton className='h-16 w-1/2' />
          <Skeleton className='h-16 w-3/4' />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyHeader>
            <EmptyTitle>Unable to load conversation</EmptyTitle>
            <EmptyDescription>{errorMessage ?? 'Please try a different thread.'}</EmptyDescription>
          </EmptyHeader>
        </EmptyContent>
      </Empty>
    );
  }

  if (!thread) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyHeader>
            <EmptyTitle>Select a conversation</EmptyTitle>
            <EmptyDescription>Choose a customer thread from the queue to start chatting.</EmptyDescription>
          </EmptyHeader>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <section className='flex h-[calc(100vh-16rem)] flex-col rounded-2xl border border-primary/15 bg-white shadow-[0_12px_28px_rgba(19,87,167,0.08)]'>
      <header className='space-y-2 border-b border-primary/15 bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_100%)] px-4 py-3'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div>
            <h2 className='text-base font-semibold text-text-primary'>{threadTitle}</h2>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Badge className={cn('rounded-md px-2 py-0.5', CONVERSATION_STATUS_CLASSNAMES[thread.apiStatus])}>
              {CONVERSATION_STATUS_LABELS[thread.apiStatus]}
            </Badge>
            <Badge className='rounded-md px-2 py-0.5'>{CONVERSATION_CHANNEL_LABELS[thread.channel]}</Badge>
          </div>
        </div>
      </header>

      <div
        ref={messageListRef}
        className='flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_18%_8%,rgba(31,111,210,0.08),transparent_42%),linear-gradient(180deg,#f9fcff_0%,#f2f7ff_100%)] px-4 py-4'
      >
        {thread.messages.map(message => {
          const isCustomerMessage = message.kind === 'customer';
          const isSystemMessage = message.kind === 'system';

          return (
            <article
              key={message.id}
              className={cn(
                'max-w-[80%] rounded-xl px-3 py-2 text-sm',
                isSystemMessage
                  ? 'mx-auto max-w-[90%] border border-primary/20 bg-chat-systemBg text-chat-systemText'
                  : isCustomerMessage
                    ? 'mr-auto border border-primary/10 bg-chat-customerBubble text-text-primary shadow-sm'
                    : 'ml-auto bg-chat-agentBubble text-chat-agentText shadow-[0_10px_22px_rgba(20,87,167,0.22)]'
              )}
            >
              <p>{message.text}</p>
              <p className={cn('mt-1 text-[11px]', isCustomerMessage ? 'text-text-hint' : 'text-chat-agentTimeColor')}>
                {message.senderName} · {formatTime(message.createdAt)}
              </p>
            </article>
          );
        })}
      </div>

      {thread.apiStatus === COMPLAINT_API_STATUSES.RESOLVED || thread.apiStatus === COMPLAINT_API_STATUSES.CLOSED ? (
        <div className='border-t border-primary/15 bg-surface p-3 text-xs text-text-muted'>
          Conversation is resolved.
        </div>
      ) : (
        <MessageComposer isSubmitting={isSending} onSubmit={onSendMessage} />
      )}
    </section>
  );
};
