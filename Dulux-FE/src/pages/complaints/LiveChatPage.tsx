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
    <main className='wf-detail-shell flex min-h-[calc(100vh-8.75rem)] flex-col overflow-y-auto pb-4'>
      <section className='relative overflow-hidden rounded-3xl border border-primary/20 bg-[linear-gradient(120deg,#0d4ea8_0%,#2a7ddb_45%,#7fc5ff_100%)] p-5 text-white shadow-[0_18px_42px_rgba(18,79,165,0.33)] md:p-6'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,rgba(255,255,255,0.32),transparent_42%)]'
        />
        <div className='relative'>
          <p className='text-xs font-semibold uppercase tracking-[2px] text-blue-100'>Live Support Operations</p>
          <h1 className='mt-1 text-2xl font-extrabold tracking-tight text-white'>Live Chat</h1>
          <p className='text-sm text-blue-50/90'>
            Manage customer conversations in real time with better visibility and faster resolution.
          </p>
        </div>
      </section>

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
