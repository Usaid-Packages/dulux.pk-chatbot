/* eslint import/order: off */
import type { JSX } from 'react';
import { useEffect, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import {
  ChatThreadPanel,
  ConversationInfoPanel,
  ConversationListPanel,
  ConversationStats,
  EscalateConversationModal,
  ResolveConversationModal,
  TransferConversationModal,
} from '#/components/complaints';
import { Button, Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '#/components/ui';
import { ROUTES } from '#/constants';
import { useComplaintThread, useComplaints } from '#/hooks/complaints';
import type {
  EscalateConversationFormValues,
  ResolveConversationFormValues,
  TransferConversationFormValues,
} from '#/schemas/complaints.schema';
import type { ConversationListItem } from '#/types/complaints';

const PAGE_SIZE = 10;
const EMPTY_CONVERSATIONS: ConversationListItem[] = [];

/**
 * LiveChatPage renders the full complaints chat workspace with queue + active thread.
 *
 * @returns Live chat page route.
 */
export const LiveChatPage = (): JSX.Element => {
  const { id: selectedThreadId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { conversationsQuery, filters, setStatusFilter, setPriorityFilter, setSearch, setPage } = useComplaints();

  const threadId = selectedThreadId ?? '';
  const {
    threadQuery,
    sendMessage,
    resolveConversation,
    transferConversation,
    escalateConversation,
    isMessageSending,
    isActionPending,
  } = useComplaintThread(threadId);

  const [isResolveOpen, setResolveOpen] = useState(false);
  const [isTransferOpen, setTransferOpen] = useState(false);
  const [isEscalateOpen, setEscalateOpen] = useState(false);

  const conversationItems = conversationsQuery.data?.items ?? EMPTY_CONVERSATIONS;
  const totalItems = conversationsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

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

  const handlePrevPage = (): void => {
    if (filters.page > 1) {
      setPage(filters.page - 1);
    }
  };

  const handleNextPage = (): void => {
    if (filters.page < totalPages) {
      setPage(filters.page + 1);
    }
  };

  const openResolveModal = (): void => setResolveOpen(true);
  const openTransferModal = (): void => setTransferOpen(true);
  const openEscalateModal = (): void => setEscalateOpen(true);

  const closeResolveModal = (): void => setResolveOpen(false);
  const closeTransferModal = (): void => setTransferOpen(false);
  const closeEscalateModal = (): void => setEscalateOpen(false);

  const submitResolve = (values: ResolveConversationFormValues): void => {
    if (!threadId) {
      return;
    }

    resolveConversation({
      threadId,
      ...values,
    });
    closeResolveModal();
  };

  const submitTransfer = (values: TransferConversationFormValues): void => {
    if (!threadId) {
      return;
    }

    transferConversation({
      threadId,
      ...values,
    });
    closeTransferModal();
  };

  const submitEscalate = (values: EscalateConversationFormValues): void => {
    if (!threadId) {
      return;
    }

    escalateConversation({
      threadId,
      ...values,
    });
    closeEscalateModal();
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
    <main className='wf-detail-shell'>
      <ConversationStats stats={conversationsQuery.data?.stats} />

      <section className='grid gap-4 xl:grid-cols-[340px_1fr_300px]'>
        <ConversationListPanel
          items={conversationItems}
          isLoading={conversationsQuery.isLoading}
          status={filters.status}
          priority={filters.priority}
          search={filters.search ?? ''}
          selectedThreadId={selectedThreadId}
          onStatusChange={setStatusFilter}
          onPriorityChange={setPriorityFilter}
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

        <ConversationInfoPanel
          thread={threadQuery.data}
          onResolve={openResolveModal}
          onTransfer={openTransferModal}
          onEscalate={openEscalateModal}
        />
      </section>

      <div className='wf-pagination-panel'>
        <p className='text-sm text-text-muted'>
          Page {filters.page} of {totalPages}
        </p>

        <div className='flex gap-2'>
          <Button type='button' variant='outline' onClick={handlePrevPage} disabled={filters.page <= 1}>
            Previous
          </Button>
          <Button type='button' variant='outline' onClick={handleNextPage} disabled={filters.page >= totalPages}>
            Next
          </Button>
        </div>
      </div>

      <ResolveConversationModal
        isOpen={isResolveOpen}
        isSubmitting={isActionPending}
        onClose={closeResolveModal}
        onSubmit={submitResolve}
      />

      <TransferConversationModal
        isOpen={isTransferOpen}
        isSubmitting={isActionPending}
        onClose={closeTransferModal}
        onSubmit={submitTransfer}
      />

      <EscalateConversationModal
        isOpen={isEscalateOpen}
        isSubmitting={isActionPending}
        onClose={closeEscalateModal}
        onSubmit={submitEscalate}
      />
    </main>
  );
};
