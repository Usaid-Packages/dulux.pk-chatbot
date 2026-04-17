import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { AuditTimelinePanel } from '#/components/auditLogs';
import {
  ChatThreadPanel,
  ConversationInfoPanel,
  ConversationListPanel,
  ResolveConversationModal,
  ConversationStats,
} from '#/components/complaints';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '#/components/ui';
import { ROUTES } from '#/constants';
import { useComplaintThread, useComplaints } from '#/hooks/complaints';
import type { ConversationListItem, ConversationStats as ConversationStatsType } from '#/types/complaints';
const EMPTY_CONVERSATIONS: ConversationListItem[] = [];

/**
 * LiveChatPage renders the full complaints chat workspace with queue + active thread.
 *
 * @returns Live chat page route.
 */
export const LiveChatPage = (): JSX.Element => {
  const { id: selectedThreadId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    conversationsQuery,
    conversations,
    cardCountsQuery,
    filters,
    hasNextPage,
    isFetchingNextPage,
    loadNextPage,
    setStatusFilter,
    setSearch,
  } = useComplaints();

  const threadId = selectedThreadId ?? '';
  const { threadQuery, sendMessage, resolveConversation, isMessageSending, isActionPending } =
    useComplaintThread(threadId);
  const [isResolveOpen, setResolveOpen] = useState(false);
  const [openedThreadIds, setOpenedThreadIds] = useState<Set<string>>(new Set());

  const conversationItems = conversations.items ?? EMPTY_CONVERSATIONS;
  const conversationStats: ConversationStatsType = {
    open: cardCountsQuery.data?.open ?? 0,
    inProgress: cardCountsQuery.data?.inProgress ?? 0,
    resolved: conversations.stats.resolved ?? 0,
    closed: cardCountsQuery.data?.closed ?? 0,
  };

  useEffect(() => {
    if (!selectedThreadId) {
      return;
    }

    setOpenedThreadIds(previous => {
      if (previous.has(selectedThreadId)) {
        return previous;
      }

      const next = new Set(previous);
      next.add(selectedThreadId);
      return next;
    });
  }, [selectedThreadId]);

  const openUnseenThreadIds = useMemo(() => {
    return conversationItems
      .filter(item => item.apiStatus === 'OPEN' && !openedThreadIds.has(item.id))
      .map(item => item.id);
  }, [conversationItems, openedThreadIds]);

  useEffect(() => {
    if (selectedThreadId) {
      return;
    }

    const firstThreadId = conversationItems[0]?.id;
    if (!firstThreadId) {
      return;
    }

    navigate(ROUTES.COMPLAINT_THREAD(firstThreadId), { replace: true });
  }, [conversationItems, navigate, selectedThreadId]);

  const handleThreadSelect = (threadItemId: string): void => {
    if (threadItemId === selectedThreadId) {
      return;
    }

    navigate(ROUTES.COMPLAINT_THREAD(threadItemId));
  };

  const handleResolveConversation = (): void => {
    if (!threadId) {
      return;
    }

    setResolveOpen(true);
  };

  const closeResolveModal = (): void => {
    setResolveOpen(false);
  };

  const confirmResolveConversation = (closureNote: string): void => {
    if (!threadId) {
      return;
    }

    resolveConversation(closureNote);
    setResolveOpen(false);
  };

  if (conversationsQuery.isError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Failed to load live chat</EmptyTitle>
          <EmptyDescription>
            {conversationsQuery.error?.message ?? 'Unable to fetch conversation queue.'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <main className='wf-detail-shell flex min-h-[calc(100vh-8.75rem)] flex-col overflow-y-auto pb-4'>
      <ConversationStats stats={conversationStats} />

      <section className='grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(18rem,21rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(18rem,21rem)_minmax(0,1fr)_minmax(20rem,24rem)]'>
        <div className='min-w-0 space-y-4'>
          <ConversationListPanel
            items={conversationItems}
            openUnseenThreadIds={openUnseenThreadIds}
            isLoading={conversationsQuery.isLoading && conversationItems.length === 0}
            status={filters.status}
            search={filters.search ?? ''}
            selectedThreadId={selectedThreadId}
            onStatusChange={setStatusFilter}
            onSearchChange={setSearch}
            onThreadSelect={handleThreadSelect}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadNextPage={loadNextPage}
          />
        </div>

        <div className='min-w-0 space-y-4'>
          <ChatThreadPanel
            thread={threadQuery.data}
            isLoading={Boolean(selectedThreadId) && threadQuery.isLoading}
            isError={Boolean(selectedThreadId) && threadQuery.isError}
            errorMessage={threadQuery.error?.message}
            isSending={isMessageSending}
            onSendMessage={sendMessage}
          />
        </div>

        <div className='min-w-0 space-y-4 xl:col-span-2 2xl:col-span-1'>
          <ConversationInfoPanel thread={threadQuery.data} onResolve={handleResolveConversation} />
          <AuditTimelinePanel
            type='complaint'
            objectId={threadId}
            title='Latest Timeline Changes'
            subtitle='Detailed admin activity log'
            maxItems={6}
          />
        </div>
      </section>

      <ResolveConversationModal
        isOpen={isResolveOpen}
        isSubmitting={isActionPending}
        onClose={closeResolveModal}
        onConfirm={confirmResolveConversation}
      />
    </main>
  );
};
