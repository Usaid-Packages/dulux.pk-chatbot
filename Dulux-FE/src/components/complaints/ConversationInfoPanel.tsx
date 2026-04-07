import type { JSX } from 'react';

import { CONVERSATION_STATUS_LABELS } from '#/components/complaints/constants';
import { Button } from '#/components/ui';
import type { ConversationThread } from '#/types/complaints';

interface ConversationInfoPanelProps {
  thread?: ConversationThread;
  onResolve: () => void;
}

const formatDateTime = (isoDateTime?: string): string => {
  if (!isoDateTime) {
    return '--';
  }

  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat('en-PK', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

/**
 * ConversationInfoPanel renders scoped customer and complaint summary with supported actions only.
 *
 * @param props - Thread data and resolve action handler.
 * @returns Right-side info panel.
 */
export const ConversationInfoPanel = ({ thread, onResolve }: ConversationInfoPanelProps): JSX.Element => {
  if (!thread) {
    return (
      <aside className='flex h-[calc(100vh-16rem)] flex-col rounded-2xl border border-primary/15 bg-white/95 p-4 text-sm text-text-muted shadow-[0_12px_28px_rgba(19,87,167,0.08)]'>
        Customer details appear here after selecting a conversation.
      </aside>
    );
  }

  return (
    <aside className='flex h-[calc(100vh-16rem)] flex-col gap-4 rounded-2xl border border-primary/15 bg-white/95 p-4 shadow-[0_12px_28px_rgba(19,87,167,0.08)]'>
      <section className='text-center'>
        <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white'>
          {getInitials(thread.customerName)}
        </div>
        <h3 className='mt-2 text-base font-semibold text-text-primary'>{thread.customerName}</h3>
        <p className='text-xs text-text-muted'>{thread.customerPhone}</p>
      </section>

      <section className='space-y-2 rounded-xl border border-primary/15 bg-primary/5 p-3'>
        <p className='text-xs font-semibold uppercase tracking-wide text-text-muted'>Complaint Details</p>
        <div className='grid grid-cols-2 gap-2 text-xs'>
          <span className='text-text-muted'>Ticket</span>
          <span className='font-medium text-text-primary'>{thread.ticketId}</span>
          <span className='text-text-muted'>Submitted</span>
          <span className='font-medium text-text-primary'>{formatDateTime(thread.submittedAt)}</span>
          <span className='text-text-muted'>Subject</span>
          <span className='font-medium text-text-primary'>{thread.issueType}</span>
          <span className='text-text-muted'>Description</span>
          <span className='font-medium text-text-primary'>{thread.description || '--'}</span>
          <span className='text-text-muted'>Registration</span>
          <span className='font-medium text-text-primary'>{thread.registrationId || '--'}</span>
          <span className='text-text-muted'>Status</span>
          <span className='font-medium text-text-primary'>{CONVERSATION_STATUS_LABELS[thread.apiStatus]}</span>
          <span className='text-text-muted'>Closure Note</span>
          <span className='font-medium text-text-primary'>{thread.closureNote || '--'}</span>
          <span className='text-text-muted'>Closed At</span>
          <span className='font-medium text-text-primary'>{formatDateTime(thread.closedAt ?? undefined)}</span>
        </div>
      </section>

      <section className='flex-1 space-y-2 overflow-y-auto rounded-xl border border-primary/15 bg-white/85 p-3'>
        <p className='text-xs font-semibold uppercase tracking-wide text-text-muted'>Complaint Images</p>
        {thread.complaintImages.length === 0 ? (
          <p className='text-xs text-text-muted'>No images</p>
        ) : (
          <div className='grid grid-cols-2 gap-2'>
            {thread.complaintImages.map(image => (
              <a key={image.id} href={image.url} target='_blank' rel='noreferrer'>
                <img
                  src={image.url}
                  alt={image.name}
                  className='h-24 w-full rounded-xl border border-primary/20 object-cover'
                  loading='lazy'
                />
              </a>
            ))}
          </div>
        )}
      </section>

      <section className='space-y-2'>
        <Button
          type='button'
          className='h-10 w-full rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white shadow-[0_12px_24px_rgba(24,102,198,0.25)] hover:brightness-105'
          onClick={onResolve}
          disabled={thread.apiStatus === 'RESOLVED' || thread.apiStatus === 'CLOSED'}
        >
          Mark as Resolved
        </Button>
      </section>
    </aside>
  );
};
