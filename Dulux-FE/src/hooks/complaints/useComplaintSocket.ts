import { useCallback, useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { queryKeys } from '#/constants';
import { useAuthContext } from '#/context/AuthContext';
import { buildComplaintsSocketUrl } from '#/data-layer/complaints/transport';
import { complaintApiMessageSchema } from '#/schemas/complaints.schema';
import type { ConversationThread } from '#/types/complaints';
import { appendMessageToConversationThread, normalizeComplaintApiMessage } from '#/utils';

const SOCKET_CLOSURE_UNAUTHORIZED = 4401;
const SOCKET_CLOSURE_NOT_FOUND = 4404;
const SOCKET_NORMAL_CLOSURE = 1000;
const SOCKET_READY_STATE_OPEN = 1;
const MAX_SOCKET_RETRIES = 3;
const RETRY_DELAY_MS_BASE = 1000;

interface UseComplaintSocketArgs {
  threadId: string;
  enabled: boolean;
}

interface UseComplaintSocketResult {
  isConnected: boolean;
  sendSocketMessage: (text: string) => boolean;
}

interface DeliveryFailurePayload {
  error: string;
  message?: unknown;
}

const appendMessageToThreadCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  threadId: string,
  payload: unknown
): boolean => {
  const parseResult = complaintApiMessageSchema.safeParse(payload);
  if (!parseResult.success) {
    return false;
  }

  const normalizedMessage = normalizeComplaintApiMessage(parseResult.data, threadId);

  queryClient.setQueryData<ConversationThread | undefined>(queryKeys.complaints.detail(threadId), previousThread => {
    if (!previousThread) {
      return previousThread;
    }

    return appendMessageToConversationThread(previousThread, normalizedMessage);
  });

  void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all });
  return true;
};

/**
 * useComplaintSocket manages complaint-room websocket receive/send behavior.
 *
 * @param args - Selected complaint thread and activation state.
 * @returns Socket state and send function.
 */
export const useComplaintSocket = ({ threadId, enabled }: UseComplaintSocketArgs): UseComplaintSocketResult => {
  const queryClient = useQueryClient();
  const { token } = useAuthContext();

  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const sendSocketMessage = useCallback(
    (text: string): boolean => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== SOCKET_READY_STATE_OPEN) {
        return false;
      }

      socket.send(JSON.stringify({ text }));
      return true;
    },
    [socketRef]
  );

  useEffect(() => {
    if (!enabled || !token || threadId.length === 0) {
      setIsConnected(false);
      return;
    }

    let isEffectActive = true;
    let reconnectAttempts = 0;
    let reconnectTimer: number | null = null;
    let activeSocket: WebSocket | null = null;

    const clearReconnectTimer = (): void => {
      if (reconnectTimer === null) {
        return;
      }

      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    };

    const connect = (): void => {
      if (!isEffectActive) {
        return;
      }

      const socketUrl = buildComplaintsSocketUrl(threadId, token);
      const socket = new WebSocket(socketUrl);
      activeSocket = socket;
      socketRef.current = socket;

      socket.onopen = () => {
        if (!isEffectActive || socketRef.current !== socket) {
          return;
        }

        reconnectAttempts = 0;
        setIsConnected(true);
      };

      socket.onmessage = event => {
        if (!isEffectActive || socketRef.current !== socket) {
          return;
        }

        let parsedPayload: unknown;
        try {
          parsedPayload = JSON.parse(event.data as string);
        } catch {
          return;
        }

        if (parsedPayload && typeof parsedPayload === 'object' && 'error' in parsedPayload) {
          const errorPayload = parsedPayload as DeliveryFailurePayload;

          if (typeof errorPayload.error === 'string' && errorPayload.error.trim().length > 0) {
            const hasMessage = appendMessageToThreadCache(queryClient, threadId, errorPayload.message);
            void hasMessage;
            toast.warning(errorPayload.error);
            return;
          }
        }

        appendMessageToThreadCache(queryClient, threadId, parsedPayload);
      };

      socket.onclose = event => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        setIsConnected(false);

        if (!isEffectActive || activeSocket !== socket) {
          return;
        }

        if (event.code === SOCKET_CLOSURE_UNAUTHORIZED) {
          toast.error('Chat session expired. Please login again.');
          return;
        }

        if (event.code === SOCKET_CLOSURE_NOT_FOUND) {
          toast.error('Conversation not found.');
          return;
        }

        if (reconnectAttempts >= MAX_SOCKET_RETRIES) {
          return;
        }

        const retryDelay = RETRY_DELAY_MS_BASE * 2 ** reconnectAttempts;
        reconnectAttempts += 1;

        clearReconnectTimer();
        reconnectTimer = window.setTimeout(() => {
          connect();
        }, retryDelay);
      };
    };

    connect();

    return () => {
      isEffectActive = false;
      clearReconnectTimer();
      setIsConnected(false);

      if (activeSocket) {
        activeSocket.close(SOCKET_NORMAL_CLOSURE, 'chat-view-change');
      }

      if (socketRef.current === activeSocket) {
        socketRef.current = null;
      }
    };
  }, [enabled, queryClient, threadId, token]);

  return {
    isConnected,
    sendSocketMessage,
  };
};
