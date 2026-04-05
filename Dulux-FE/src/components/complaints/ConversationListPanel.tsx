/* eslint import/order: off */
import type { JSX } from 'react';

import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '#/components/ui';
import type { ConversationListItem, ConversationPriorityFilter, ConversationStatusFilter } from '#/types/complaints';
import { cn } from '#/utils';

import {
  CONVERSATION_CHANNEL_LABELS,
  CONVERSATION_PRIORITY_CLASSNAMES,
  CONVERSATION_STATUS_CLASSNAMES,
  CONVERSATION_STATUS_LABELS,
  CONVERSATION_STATUS_TABS,
} from './constants';

interface ConversationListPanelProps {
  items: ConversationListItem[];
  isLoading: boolean;
  status: ConversationStatusFilter;
  priority: ConversationPriorityFilter;
  search: string;
  selectedThreadId?: string;
  onStatusChange: (status: ConversationStatusFilter) => void;
  onPriorityChange: (priority: ConversationPriorityFilter) => void;
  onSearchChange: (search: string) => void;
  onThreadSelect: (threadId: string) => void;
}

const formatConversationTime = (isoDateTime: string): string => {
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat('en-PK', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

/**
 * ConversationListPanel renders chat queue filters and selectable thread list.
 *
 * @param props - Queue state and handlers.
 * @returns Queue panel.
 */
export const ConversationListPanel = ({
  items,
  isLoading,
  status,
  priority,
  search,
  selectedThreadId,
  onStatusChange,
  onPriorityChange,
  onSearchChange,
  onThreadSelect,
}: ConversationListPanelProps): JSX.Element => {
  return (
    <section className='rounded-lg border border-border bg-chat-panelBg p-4'>
      <div className='space-y-3'>
        <div className='space-y-2'>
          <Input
            value={search}
            onChange={event => onSearchChange(event.target.value)}
            placeholder='Search by customer, claim, city, or registration'
            aria-label='Search conversations'
          />

          <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
            <Select value={status} onValueChange={value => onStatusChange(value as ConversationStatusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder='Status' />
              </SelectTrigger>
              <SelectContent>
                {CONVERSATION_STATUS_TABS.map(tab => (
                  <SelectItem key={tab.value} value={tab.value}>
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={value => onPriorityChange(value as ConversationPriorityFilter)}>
              <SelectTrigger>
                <SelectValue placeholder='Priority' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All priorities</SelectItem>
                <SelectItem value='high'>High</SelectItem>
                <SelectItem value='normal'>Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className='space-y-2'>
          {isLoading ? (
            <>
              <Skeleton className='h-20 w-full rounded-lg' />
              <Skeleton className='h-20 w-full rounded-lg' />
              <Skeleton className='h-20 w-full rounded-lg' />
            </>
          ) : null}

          {!isLoading && items.length === 0 ? (
            <div className='rounded-lg border border-dashed border-border bg-surface p-5 text-sm text-text-muted'>
              No conversation matches the current filters.
            </div>
          ) : null}

          {!isLoading
            ? items.map(item => {
                const isSelected = item.id === selectedThreadId;

                const handleItemClick = (): void => {
                  onThreadSelect(item.id);
                };

                return (
                  <Button
                    key={item.id}
                    type='button'
                    variant='ghost'
                    className={cn(
                      'h-auto w-full flex-col items-start gap-2 wf-card wf-card-p3 text-left hover:bg-chat-convActiveBg',
                      isSelected ? 'border-chat-convActiveBorder bg-chat-convActiveBg' : ''
                    )}
                    onClick={handleItemClick}
                  >
                    <div className='flex w-full items-start justify-between gap-2'>
                      <div>
                        <p className='text-sm font-semibold text-text-primary'>{item.customerName}</p>
                        <p className='text-xs text-text-muted'>
                          {item.claimNumber} · {item.city}
                        </p>
                      </div>
                      <p className='text-[11px] text-text-muted'>{formatConversationTime(item.lastMessageAt)}</p>
                    </div>

                    <p className='line-clamp-2 w-full text-xs text-text-secondary'>{item.lastMessagePreview}</p>

                    <div className='flex w-full flex-wrap items-center gap-2'>
                      <Badge className={cn('rounded-md px-2 py-0.5', CONVERSATION_STATUS_CLASSNAMES[item.status])}>
                        {CONVERSATION_STATUS_LABELS[item.status]}
                      </Badge>

                      <Badge
                        className={cn(
                          'rounded-md px-2 py-0.5 capitalize',
                          CONVERSATION_PRIORITY_CLASSNAMES[item.priority]
                        )}
                      >
                        {item.priority}
                      </Badge>

                      <Badge className='rounded-md px-2 py-0.5'>{CONVERSATION_CHANNEL_LABELS[item.channel]}</Badge>

                      {item.unreadCount > 0 ? (
                        <span className='ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-chat-unreadDot px-2 py-0.5 text-[11px] font-semibold text-white'>
                          {item.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </Button>
                );
              })
            : null}
        </div>
      </div>
    </section>
  );
};
