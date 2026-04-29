import { memo, useMemo } from 'react';
import type { ChangeEvent, JSX, MouseEvent, UIEvent } from 'react';

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
import type { ConversationListItem, ConversationStatusFilter } from '#/types/complaints';
import { cn, formatPkDateTime } from '#/utils';
import {
  CONVERSATION_CHANNEL_LABELS,
  CONVERSATION_STATUS_CLASSNAMES,
  CONVERSATION_STATUS_LABELS,
  CONVERSATION_STATUS_TABS,
} from './constants';

const LOAD_MORE_THRESHOLD_PX = 48;

interface ConversationListPanelProps {
  items: ConversationListItem[];
  openUnseenThreadIds: string[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  status: ConversationStatusFilter;
  search: string;
  selectedThreadId?: string;
  onLoadNextPage: () => void;
  onStatusChange: (status: ConversationStatusFilter) => void;
  onSearchChange: (search: string) => void;
  onThreadSelect: (threadId: string) => void;
}

interface ConversationRowViewModel {
  id: string;
  customerName: string;
  lastMessagePreview: string;
  unreadCount: number;
  apiStatus: ConversationListItem['apiStatus'];
  channel: ConversationListItem['channel'];
  isSelected: boolean;
  hasOpenUnseenIndicator: boolean;
  formattedLastMessageAt: string;
}

interface ConversationListRowProps {
  item: ConversationRowViewModel;
  onThreadSelect: (event: MouseEvent<HTMLButtonElement>) => void;
}

const isConversationStatusFilter = (value: string): value is ConversationStatusFilter => {
  return CONVERSATION_STATUS_TABS.some(tab => tab.value === value);
};

const ConversationListRow = memo(({ item, onThreadSelect }: ConversationListRowProps): JSX.Element => {
  return (
    <Button
      type='button'
      variant='ghost'
      className={cn(
        'h-auto w-full flex-col items-start gap-2 rounded-xl border border-primary/15 bg-white px-3 py-3 text-left transition-all hover:bg-primary/5',
        item.isSelected ? 'border-primary/40 bg-primary/10 shadow-[0_10px_24px_rgba(19,87,167,0.12)]' : ''
      )}
      data-thread-id={item.id}
      onClick={onThreadSelect}
    >
      <div className='flex w-full items-start justify-between gap-2'>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-semibold text-text-primary'>{item.customerName}</p>
        </div>
        <p className='shrink-0 whitespace-nowrap text-[11px] text-text-muted'>{item.formattedLastMessageAt}</p>
      </div>

      <p className='line-clamp-2 w-full text-xs text-text-muted'>{item.lastMessagePreview}</p>

      <div className='flex w-full flex-wrap items-center gap-2'>
        <Badge className={cn('rounded-md px-2 py-0.5', CONVERSATION_STATUS_CLASSNAMES[item.apiStatus])}>
          {CONVERSATION_STATUS_LABELS[item.apiStatus]}
        </Badge>

        <Badge className='rounded-md px-2 py-0.5'>{CONVERSATION_CHANNEL_LABELS[item.channel]}</Badge>

        {item.hasOpenUnseenIndicator ? (
          <span
            className='ml-auto inline-flex h-2.5 w-2.5 rounded-full bg-chat-unreadDot'
            aria-label='Unopened open complaint'
            title='Unopened open complaint'
          />
        ) : item.unreadCount > 0 ? (
          <span className='ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-chat-unreadDot px-2 py-0.5 text-[11px] font-semibold text-white'>
            {item.unreadCount}
          </span>
        ) : null}
      </div>
    </Button>
  );
});
ConversationListRow.displayName = 'ConversationListRow';

/**
 * ConversationListPanel renders chat queue filters and selectable thread list.
 *
 * @param props - Queue state and handlers.
 * @returns Queue panel.
 */
export const ConversationListPanel = ({
  items,
  openUnseenThreadIds,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  status,
  search,
  selectedThreadId,
  onLoadNextPage,
  onStatusChange,
  onSearchChange,
  onThreadSelect,
}: ConversationListPanelProps): JSX.Element => {
  const rowItems = useMemo<ConversationRowViewModel[]>(() => {
    const openUnseenThreadIdSet = new Set(openUnseenThreadIds);

    return items.map(item => ({
      id: item.id,
      customerName: item.customerName,
      lastMessagePreview: item.lastMessagePreview,
      unreadCount: item.unreadCount,
      apiStatus: item.apiStatus,
      channel: item.channel,
      isSelected: item.id === selectedThreadId,
      hasOpenUnseenIndicator: openUnseenThreadIdSet.has(item.id),
      formattedLastMessageAt: formatPkDateTime(item.lastMessageAt),
    }));
  }, [items, openUnseenThreadIds, selectedThreadId]);

  const handleListScroll = (event: UIEvent<HTMLDivElement>): void => {
    if (!hasNextPage || isLoading || isFetchingNextPage) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
    if (distanceToBottom <= LOAD_MORE_THRESHOLD_PX) {
      onLoadNextPage();
    }
  };

  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onSearchChange(event.target.value);
  };

  const handleStatusValueChange = (value: string): void => {
    if (!isConversationStatusFilter(value)) {
      return;
    }

    onStatusChange(value);
  };

  const handleThreadSelectClick = (event: MouseEvent<HTMLButtonElement>): void => {
    const threadId = event.currentTarget.dataset.threadId;
    if (!threadId) {
      return;
    }

    onThreadSelect(threadId);
  };

  return (
    <section className='flex h-[calc(100vh-16rem)] min-h-0 flex-col overflow-hidden rounded-2xl border border-primary/15 bg-white p-4 shadow-[0_12px_28px_rgba(19,87,167,0.08)]'>
      <div className='flex min-h-0 flex-1 flex-col gap-3'>
        <div className='space-y-2 rounded-xl border border-primary/20 bg-white/85 p-3'>
          <Input
            type='search'
            value={search}
            onChange={handleSearchInputChange}
            placeholder='Search by subject or phone'
            className='h-10 rounded-xl border-primary/25 bg-white'
            aria-label='Search conversations'
          />

          <div className='grid grid-cols-1 gap-2'>
            <Select value={status} onValueChange={handleStatusValueChange}>
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
          </div>
        </div>

        <div className='min-h-0 flex-1 space-y-2 overflow-y-auto pr-1' onScroll={handleListScroll}>
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
            ? rowItems.map(item => (
                <ConversationListRow key={item.id} item={item} onThreadSelect={handleThreadSelectClick} />
              ))
            : null}

          {isFetchingNextPage ? <Skeleton className='h-20 w-full rounded-lg' /> : null}
        </div>
      </div>
    </section>
  );
};
