import type { JSX } from 'react';
import { useEffect, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

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
import type { ConversationListItem } from '#/types/complaints';
const EMPTY_CONVERSATIONS: ConversationListItem[] = [];

/**
 * LiveChatPage renders the full complaints chat workspace with queue + active thread.
 *
 * @returns Live chat page route.
 */
export const LiveChatPage = (): JSX.Element => {
  const { id: selectedThreadId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { conversationsQuery, filters, setStatusFilter, setSearch } = useComplaints();

  const threadId = selectedThreadId ?? '';
  const { threadQuery, sendMessage, resolveConversation, isMessageSending, isActionPending } =
    useComplaintThread(threadId);
  const [isResolveOpen, setResolveOpen] = useState(false);

  const conversationItems = conversationsQuery.data?.items ?? EMPTY_CONVERSATIONS;
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
    <main className='wf-detail-shell flex h-[calc(100vh-8.75rem)] flex-col overflow-hidden'>
      <ConversationStats stats={conversationsQuery.data?.stats} />

      <section className='grid min-h-0 flex-1 gap-4 xl:grid-cols-[340px_1fr_300px]'>
        <ConversationListPanel
          items={conversationItems}
          isLoading={conversationsQuery.isLoading}
          status={filters.status}
          search={filters.search ?? ''}
          selectedThreadId={selectedThreadId}
          onStatusChange={setStatusFilter}
          onSearchChange={setSearch}
          onThreadSelect={handleThreadSelect}
        />

        <ChatThreadPanel
          thread={threadQuery.data}
          isLoading={Boolean(selectedThreadId) && threadQuery.isLoading}
          isError={Boolean(selectedThreadId) && threadQuery.isError}
          errorMessage={threadQuery.error?.message}
          isSending={isMessageSending}
          onSendMessage={sendMessage}
        />

        <ConversationInfoPanel thread={threadQuery.data} onResolve={handleResolveConversation} />
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
