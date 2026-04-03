/* eslint import/order: off */
import type { JSX } from 'react';

import { Badge, Button } from '#/components/ui';
import type { ConversationThread } from '#/types/complaints';
import { cn } from '#/utils';

import {
  CONVERSATION_PRIORITY_CLASSNAMES,
  CONVERSATION_STATUS_CLASSNAMES,
  CONVERSATION_STATUS_LABELS,
} from './constants';

interface ConversationInfoPanelProps {
  thread?: ConversationThread;
  onResolve: () => void;
  onTransfer: () => void;
  onEscalate: () => void;
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
 * ConversationInfoPanel renders customer and complaint detail context plus action buttons.
 *
 * @param props - Thread data and modal action handlers.
 * @returns Right-side info panel.
 */
export const ConversationInfoPanel = ({
  thread,
  onResolve,
  onTransfer,
  onEscalate,
}: ConversationInfoPanelProps): JSX.Element => {
  if (!thread) {
    return (
      <aside className='rounded-lg border border-border bg-surface p-4 text-sm text-text-muted'>
        Customer details appear here after selecting a conversation.
      </aside>
    );
  }

  const attachments = thread.messages.flatMap(message => message.attachments ?? []).slice(0, 3);

  return (
    <aside className='space-y-4 rounded-lg border border-border bg-surface p-4'>
      <section className='text-center'>
        <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white'>
          {getInitials(thread.customerName)}
        </div>
        <h3 className='mt-2 text-base font-semibold text-text-primary'>{thread.customerName}</h3>
        <p className='text-xs text-text-muted'>{thread.customerPhone}</p>
        <p className='mt-1 text-xs text-status-approved-text'>
          {thread.whatsappConnected ? 'WhatsApp Connected' : 'WhatsApp Offline'}
        </p>
      </section>

      <section className='space-y-2 rounded-md border border-border p-3'>
        <p className='text-xs font-semibold uppercase tracking-wide text-text-muted'>Complaint Details</p>
        <div className='grid grid-cols-2 gap-2 text-xs'>
          <span className='text-text-muted'>Ticket</span>
          <span className='font-medium text-text-primary'>{thread.ticketId}</span>
          <span className='text-text-muted'>Submitted</span>
          <span className='font-medium text-text-primary'>{formatDateTime(thread.submittedAt)}</span>
          <span className='text-text-muted'>Status</span>
          <span>
            <Badge className={cn('rounded px-2 py-0.5', CONVERSATION_STATUS_CLASSNAMES[thread.status])}>
              {CONVERSATION_STATUS_LABELS[thread.status]}
            </Badge>
          </span>
          <span className='text-text-muted'>Assigned To</span>
          <span className='font-medium text-text-primary'>{thread.assignedAgent ?? 'Unassigned'}</span>
          <span className='text-text-muted'>Priority</span>
          <span>
            <Badge className={cn('rounded px-2 py-0.5 capitalize', CONVERSATION_PRIORITY_CLASSNAMES[thread.priority])}>
              {thread.priority}
            </Badge>
          </span>
          <span className='text-text-muted'>City</span>
          <span className='font-medium text-text-primary'>{thread.city}</span>
        </div>
      </section>

      <section className='space-y-2 rounded-md border border-border p-3'>
        <p className='text-xs font-semibold uppercase tracking-wide text-text-muted'>Product & Site</p>
        <div className='grid grid-cols-2 gap-2 text-xs'>
          <span className='text-text-muted'>Topcoat</span>
          <span className='font-medium text-text-primary'>{thread.topcoat ?? '--'}</span>
          <span className='text-text-muted'>Dealer</span>
          <span className='font-medium text-text-primary'>{thread.dealerName ?? '--'}</span>
          <span className='text-text-muted'>Area (sq ft)</span>
          <span className='font-medium text-text-primary'>
            {thread.affectedAreaSqFt !== undefined ? thread.affectedAreaSqFt : '--'}
          </span>
          <span className='text-text-muted'>Escalation</span>
          <span className='font-medium text-text-primary'>{thread.escalationLevel ?? 'None'}</span>
        </div>
      </section>

      <section className='space-y-2 rounded-md border border-border p-3'>
        <p className='text-xs font-semibold uppercase tracking-wide text-text-muted'>
          Attached Images ({attachments.length})
        </p>
        <div className='grid grid-cols-3 gap-2'>
          {attachments.length > 0
            ? attachments.map(attachment => (
                <a
                  key={attachment.id}
                  href={attachment.url}
                  target='_blank'
                  rel='noreferrer'
                  className='flex h-14 items-center justify-center rounded border border-border bg-surface-subtle px-1 text-[10px] text-text-muted hover:bg-surface-muted'
                >
                  IMG
                </a>
              ))
            : null}
        </div>
      </section>

      <section className='space-y-2 rounded-md border border-border p-3'>
        <p className='text-xs font-semibold uppercase tracking-wide text-text-muted'>Customer History</p>
        <div className='grid grid-cols-2 gap-2 text-xs'>
          <span className='text-text-muted'>Registrations</span>
          <span className='font-medium text-text-primary'>{thread.customerHistory.registrations}</span>
          <span className='text-text-muted'>Claims</span>
          <span className='font-medium text-text-primary'>{thread.customerHistory.claims}</span>
          <span className='text-text-muted'>Past Complaints</span>
          <span className='font-medium text-text-primary'>{thread.customerHistory.pastComplaints}</span>
        </div>
      </section>

      <section className='space-y-2'>
        <Button type='button' className='w-full' onClick={onResolve}>
          Mark as Resolved
        </Button>
        <Button type='button' variant='outline' className='w-full' onClick={onTransfer}>
          Transfer to Agent
        </Button>
        <Button
          type='button'
          variant='outline'
          className='w-full text-destructive hover:text-destructive'
          onClick={onEscalate}
        >
          Escalate
        </Button>
      </section>
    </aside>
  );
};
