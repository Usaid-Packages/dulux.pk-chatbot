import { useEffect, useRef } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { queryKeys } from '#/constants';
import { useAuthContext } from '#/context';
import {
  useCloseConversationMutation,
  getConversationById,
  useMarkConversationInProgressMutation,
  useResolveConversationMutation,
} from '#/data-layer/complaints';
import { COMPLAINT_API_STATUSES } from '#/types/complaints';
import type { CloseConversationPayload, ConversationThread, ResolveConversationPayload } from '#/types/complaints';
import { getApiErrorMessage } from '#/utils';
import { useComplaintSocket } from './useComplaintSocket';

interface UseComplaintThreadResult {
  threadQuery: UseQueryResult<ConversationThread, Error>;
  sendMessage: (message: string) => void;
  resolveConversation: (closureNote: string) => void;
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
  const { user } = useAuthContext();
  const threadQuery = useQuery<ConversationThread, Error>({
    queryKey: queryKeys.complaints.detail(threadId),
    queryFn: () => getConversationById(threadId),
    enabled: threadId.length > 0,
    refetchOnWindowFocus: false,
  });

  const markInProgressMutation = useMarkConversationInProgressMutation();
  const resolveConversationMutation = useResolveConversationMutation();
  const closeConversationMutation = useCloseConversationMutation();
  const autoTransitionAttemptedThreadsRef = useRef<Set<string>>(new Set());

  const { sendSocketMessage } = useComplaintSocket({
    threadId,
    enabled: threadQuery.isSuccess,
  });

  useEffect(() => {
    if (!threadQuery.data || !user || !threadId) {
      return;
    }

    const currentStatus = threadQuery.data.apiStatus;
    if (currentStatus !== COMPLAINT_API_STATUSES.OPEN) {
      return;
    }

    if (autoTransitionAttemptedThreadsRef.current.has(threadId)) {
      return;
    }

    if (!user || !Number.isFinite(user.id)) {
      toast.error('Unable to assign complaint: current user id is missing.');
      return;
    }

    autoTransitionAttemptedThreadsRef.current.add(threadId);
    markInProgressMutation.mutate(
      {
        threadId,
        assignedTo: user.id,
      },
      {
        onError: error => {
          toast.error(getApiErrorMessage(error));
        },
      }
    );
  }, [markInProgressMutation, threadId, threadQuery.data, user?.id]);

  const sendMessage = (message: string): void => {
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return;
    }

    const wasSent = sendSocketMessage(trimmedMessage);
    if (!wasSent) {
      toast.error('Chat socket is disconnected. Please wait and try again.');
    }
  };

  const resolveConversation = (closureNote: string): void => {
    if (threadId.length === 0 || !user || !Number.isFinite(user.id)) {
      if (!user || !Number.isFinite(user.id)) {
        toast.error('Unable to assign complaint: current user id is missing.');
      }
      return;
    }

    const normalizedClosureNote = closureNote.trim();
    if (normalizedClosureNote.length === 0) {
      toast.error('Closure note is required.');
      return;
    }

    const continueClose = (): void => {
      const payload: CloseConversationPayload = {
        threadId,
        closureNote: normalizedClosureNote,
      };
      closeConversationMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Complaint closed successfully.');
        },
        onError: error => {
          toast.error(getApiErrorMessage(error));
        },
      });
    };

    const continueResolve = (): void => {
      const payload: ResolveConversationPayload = { threadId };
      resolveConversationMutation.mutate(payload, {
        onSuccess: continueClose,
        onError: error => {
          toast.error(getApiErrorMessage(error));
        },
      });
    };

    if (threadQuery.data?.apiStatus === COMPLAINT_API_STATUSES.CLOSED) {
      toast.info('Complaint is already closed.');
      return;
    }

    if (threadQuery.data?.apiStatus === COMPLAINT_API_STATUSES.RESOLVED) {
      continueClose();
      return;
    }

    if (threadQuery.data?.apiStatus === COMPLAINT_API_STATUSES.OPEN) {
      markInProgressMutation.mutate(
        {
          threadId,
          assignedTo: user.id,
        },
        {
          onSuccess: continueResolve,
          onError: error => {
            toast.error(getApiErrorMessage(error));
          },
        }
      );
      return;
    }

    continueResolve();
  };

  return {
    threadQuery,
    sendMessage,
    resolveConversation,
    isMessageSending: false,
    isActionPending:
      markInProgressMutation.isPending || resolveConversationMutation.isPending || closeConversationMutation.isPending,
  };
};
