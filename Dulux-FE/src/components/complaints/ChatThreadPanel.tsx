/* eslint import/order: off */
import type { JSX } from 'react';
import { useEffect, useRef } from 'react';

import { Badge, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';
import type { ConversationThread } from '#/types/complaints';
import { cn } from '#/utils';

import {
  CONVERSATION_CHANNEL_LABELS,
  CONVERSATION_PRIORITY_CLASSNAMES,
  CONVERSATION_STATUS_CLASSNAMES,
  CONVERSATION_STATUS_LABELS,
} from './constants';
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

  useEffect(() => {
    if (!messageListRef.current) {
      return;
    }

    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [thread?.messages]);

  if (isLoading) {
    return (
      <section className='wf-card wf-card-p4'>
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
    <section className='flex h-[calc(100vh-16rem)] flex-col wf-card'>
      <header className='space-y-2 border-b border-border px-4 py-3'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div>
            <h2 className='text-base font-semibold text-text-primary'>{thread.customerName}</h2>
            <p className='text-xs text-text-muted'>
              {thread.claimNumber} · {thread.registrationId} · {thread.customerPhone}
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Badge className={cn('rounded-md px-2 py-0.5', CONVERSATION_STATUS_CLASSNAMES[thread.status])}>
              {CONVERSATION_STATUS_LABELS[thread.status]}
            </Badge>
            <Badge
              className={cn('rounded-md px-2 py-0.5 capitalize', CONVERSATION_PRIORITY_CLASSNAMES[thread.priority])}
            >
              {thread.priority}
            </Badge>
            <Badge className='rounded-md px-2 py-0.5'>{CONVERSATION_CHANNEL_LABELS[thread.channel]}</Badge>
          </div>
        </div>
      </header>

      {thread.status === 'unassigned' ? (
        <div className='border-b border-amber-200 bg-amber-highlight/30 px-4 py-2 text-xs text-amber-900'>
          Unassigned ticket: transfer or assign this conversation before replying.
        </div>
      ) : null}

      <div ref={messageListRef} className='flex-1 space-y-3 overflow-y-auto bg-chat-panelBg px-4 py-4'>
        {thread.messages.map(message => {
          const isCustomerMessage = message.kind === 'customer';
          const isSystemMessage = message.kind === 'system';

          return (
            <article
              key={message.id}
              className={cn(
                'max-w-[80%] rounded-xl px-3 py-2 text-sm',
                isSystemMessage
                  ? 'mx-auto max-w-[90%] bg-chat-systemBg text-chat-systemText'
                  : isCustomerMessage
                    ? 'mr-auto bg-chat-customerBubble text-text-primary'
                    : 'ml-auto bg-chat-agentBubble text-chat-agentText'
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

      {thread.status === 'resolved' ? (
        <div className='border-t border-border bg-surface p-3 text-xs text-text-muted'>
          Conversation is resolved. You can still reopen by escalating or transferring if needed.
        </div>
      ) : (
        <MessageComposer isSubmitting={isSending} onSubmit={onSendMessage} />
      )}
    </section>
  );
};
