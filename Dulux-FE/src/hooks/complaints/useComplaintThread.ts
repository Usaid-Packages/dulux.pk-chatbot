import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { queryKeys } from '#/constants';
import {
  useEscalateConversationMutation,
  getConversationById,
  useMarkConversationReadMutation,
  useResolveConversationMutation,
  useSendConversationMessageMutation,
  useTransferConversationMutation,
} from '#/data-layer/complaints';
import type {
  ConversationThread,
  EscalateConversationPayload,
  ResolveConversationPayload,
  TransferConversationPayload,
} from '#/types/complaints';
import { getApiErrorMessage } from '#/utils';

interface UseComplaintThreadResult {
  threadQuery: UseQueryResult<ConversationThread, Error>;
  sendMessage: (message: string) => void;
  resolveConversation: (payload: ResolveConversationPayload) => void;
  transferConversation: (payload: TransferConversationPayload) => void;
  escalateConversation: (payload: EscalateConversationPayload) => void;
  isMessageSending: boolean;
  isActionPending: boolean;
}

/**
 * useComplaintThread fetches one conversation thread and exposes send-message behavior.
 *
 * @param threadId - Current route thread id.
 * @returns Thread query state and send action.
 */
export const useComplaintThread = (threadId: string): UseComplaintThreadResult => {
  const threadQuery = useQuery<ConversationThread, Error>({
    queryKey: queryKeys.complaints.detail(threadId),
    queryFn: () => getConversationById(threadId),
    enabled: threadId.length > 0,
    refetchInterval: 10_000,
  });

  const sendMessageMutation = useSendConversationMessageMutation();
  const markThreadReadMutation = useMarkConversationReadMutation();
  const resolveConversationMutation = useResolveConversationMutation();
  const transferConversationMutation = useTransferConversationMutation();
  const escalateConversationMutation = useEscalateConversationMutation();

  const sendMessage = (message: string): void => {
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return;
    }

    sendMessageMutation.mutate(
      {
        threadId,
        message: trimmedMessage,
      },
      {
        onError: error => {
          toast.error(getApiErrorMessage(error));
        },
      }
    );
  };

  const resolveConversation = (payload: ResolveConversationPayload): void => {
    resolveConversationMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Conversation marked as resolved.');
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  const transferConversation = (payload: TransferConversationPayload): void => {
    transferConversationMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Conversation transferred successfully.');
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  const escalateConversation = (payload: EscalateConversationPayload): void => {
    escalateConversationMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Conversation escalated.');
      },
      onError: error => {
        toast.error(getApiErrorMessage(error));
      },
    });
  };

  useEffect(() => {
    if (!threadQuery.data) {
      return;
    }

    if (threadQuery.data.unreadCount < 1) {
      return;
    }

    markThreadReadMutation.mutate(
      { threadId: threadQuery.data.id },
      {
        onError: error => {
          toast.error(getApiErrorMessage(error));
        },
      }
    );
  }, [markThreadReadMutation, threadQuery.data]);

  return {
    threadQuery,
    sendMessage,
    resolveConversation,
    transferConversation,
    escalateConversation,
    isMessageSending: sendMessageMutation.isPending,
    isActionPending:
      resolveConversationMutation.isPending ||
      transferConversationMutation.isPending ||
      escalateConversationMutation.isPending,
  };
};
