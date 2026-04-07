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
      <aside className='flex h-[calc(100vh-16rem)] flex-col wf-card wf-card-p4 text-sm text-text-muted'>
        Customer details appear here after selecting a conversation.
      </aside>
    );
  }

  return (
    <aside className='flex h-[calc(100vh-16rem)] flex-col gap-4 wf-card wf-card-p4'>
      <section className='text-center'>
        <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white'>
          {getInitials(thread.customerName)}
        </div>
        <h3 className='mt-2 text-base font-semibold text-text-primary'>{thread.customerName}</h3>
        <p className='text-xs text-text-muted'>{thread.customerPhone}</p>
      </section>

      <section className='space-y-2 rounded-md border border-border p-3'>
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

      <section className='flex-1 space-y-2 overflow-y-auto rounded-md border border-border p-3'>
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
                  className='h-24 w-full rounded-md border border-border object-cover'
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
          className='w-full'
          onClick={onResolve}
          disabled={thread.apiStatus === 'RESOLVED' || thread.apiStatus === 'CLOSED'}
        >
          Mark as Resolved
        </Button>
      </section>
    </aside>
  );
};
