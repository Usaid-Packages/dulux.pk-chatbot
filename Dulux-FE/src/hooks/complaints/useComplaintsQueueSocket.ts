import { useEffect, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { queryKeys } from '#/constants';
import { useAuthContext } from '#/context';
import { buildComplaintsQueueSocketUrl } from '#/data-layer/complaints/transport';
import { complaintQueueSocketEventSchema } from '#/schemas/complaints.schema';
import { COMPLAINT_API_STATUSES } from '#/types/complaints';
import type { ComplaintApiStatus, ConversationListRequestParams, ConversationListResponse } from '#/types/complaints';
import { normalizeComplaintQueueSocketItem } from '#/utils';

const SOCKET_CLOSURE_UNAUTHORIZED = 4401;
const SOCKET_NORMAL_CLOSURE = 1000;
const MAX_SOCKET_RETRIES = 3;
const RETRY_DELAY_MS_BASE = 1000;
const ENABLE_COMPLAINT_QUEUE_SOCKET_DEBUG = true;

interface UseComplaintsQueueSocketArgs {
  enabled: boolean;
}

type ComplaintsListQueryKey = readonly ['complaints', 'list', Record<string, unknown>];

const doesStatusMatch = (filterValue: unknown, itemStatus: ComplaintApiStatus): boolean => {
  if (typeof filterValue !== 'string' || filterValue === 'all') {
    return true;
  }

  if (filterValue === COMPLAINT_API_STATUSES.OPEN) {
    return itemStatus === COMPLAINT_API_STATUSES.OPEN;
  }
  if (filterValue === COMPLAINT_API_STATUSES.IN_PROGRESS) {
    return itemStatus === COMPLAINT_API_STATUSES.IN_PROGRESS;
  }
  if (filterValue === COMPLAINT_API_STATUSES.RESOLVED) {
    return itemStatus === COMPLAINT_API_STATUSES.RESOLVED;
  }
  if (filterValue === COMPLAINT_API_STATUSES.CLOSED) {
    return itemStatus === COMPLAINT_API_STATUSES.CLOSED;
  }

  return true;
};

const doesSearchMatch = (searchValue: unknown, candidate: ConversationListResponse['items'][number]): boolean => {
  if (typeof searchValue !== 'string' || searchValue.trim().length === 0) {
    return true;
  }

  const normalizedSearch = searchValue.trim().toLowerCase();
  return (
    candidate.customerName.toLowerCase().includes(normalizedSearch) ||
    candidate.issueType.toLowerCase().includes(normalizedSearch) ||
    candidate.customerPhone.toLowerCase().includes(normalizedSearch)
  );
};

const incrementStats = (
  stats: ConversationListResponse['stats'],
  itemStatus: ComplaintApiStatus
): ConversationListResponse['stats'] => {
  if (itemStatus === COMPLAINT_API_STATUSES.OPEN) {
    return { ...stats, open: stats.open + 1 };
  }

  if (itemStatus === COMPLAINT_API_STATUSES.IN_PROGRESS) {
    return { ...stats, inProgress: stats.inProgress + 1 };
  }

  if (itemStatus === COMPLAINT_API_STATUSES.RESOLVED) {
    return { ...stats, resolved: stats.resolved + 1 };
  }

  return { ...stats, closed: stats.closed + 1 };
};

const debugQueueSocket = (message: string, details?: Record<string, unknown>): void => {
  if (!ENABLE_COMPLAINT_QUEUE_SOCKET_DEBUG) {
    return;
  }

  if (details) {
    console.warn(`[complaints-queue-socket] ${message}`, details);
    return;
  }

  console.warn(`[complaints-queue-socket] ${message}`);
};

/**
 * useComplaintsQueueSocket subscribes to queue-level complaint creation events and refreshes list queries.
 *
 * @param args - Activation guard for queue websocket subscription.
 */
export const useComplaintsQueueSocket = ({ enabled }: UseComplaintsQueueSocketArgs): void => {
  const queryClient = useQueryClient();
  const { token } = useAuthContext();

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isUnmountingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !token) {
      return;
    }

    isUnmountingRef.current = false;

    const clearReconnectTimer = (): void => {
      if (reconnectTimerRef.current === null) {
        return;
      }

      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    };

    const connect = (): void => {
      const socketUrl = buildComplaintsQueueSocketUrl(token);
      debugQueueSocket('connecting', { socketUrl });
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
        debugQueueSocket('connected');
      };

      socket.onmessage = event => {
        debugQueueSocket('message received', { raw: event.data as string });
        let parsedPayload: unknown;
        try {
          parsedPayload = JSON.parse(event.data as string);
        } catch {
          debugQueueSocket('message skipped - invalid JSON');
          return;
        }

        const parseResult = complaintQueueSocketEventSchema.safeParse(parsedPayload);
        if (!parseResult.success) {
          debugQueueSocket('message skipped - schema mismatch', {
            issues: parseResult.error.issues.map(issue => issue.message),
          });
          return;
        }

        debugQueueSocket('parsed complaint.created payload', { payload: parseResult.data });

        const normalizedConversation = normalizeComplaintQueueSocketItem(parseResult.data.complaint);
        if (normalizedConversation) {
          debugQueueSocket('normalized complaint queue item', { normalizedConversation });
          const listQueryEntries = queryClient.getQueriesData<ConversationListResponse>({
            queryKey: queryKeys.complaints.listBase,
          });
          debugQueueSocket('active list query entries found', { count: listQueryEntries.length });

          for (const [queryKey, currentList] of listQueryEntries) {
            if (!currentList) {
              debugQueueSocket('skipped query entry - no current list cache', { queryKey });
              continue;
            }

            const typedQueryKey = queryKey as ComplaintsListQueryKey;
            const rawFilters = typedQueryKey[2] ?? {};
            const filters = rawFilters as Partial<ConversationListRequestParams>;

            if ((filters.page ?? 1) !== 1) {
              debugQueueSocket('skipped query entry - page is not 1', {
                queryKey,
                page: filters.page ?? 1,
              });
              continue;
            }

            if (!doesStatusMatch(filters.status, normalizedConversation.apiStatus)) {
              debugQueueSocket('skipped query entry - status filter mismatch', {
                queryKey,
                filterStatus: filters.status,
                itemStatus: normalizedConversation.apiStatus,
              });
              continue;
            }

            if (!doesSearchMatch(filters.search, normalizedConversation)) {
              debugQueueSocket('skipped query entry - search filter mismatch', {
                queryKey,
                filterSearch: filters.search ?? '',
                customerName: normalizedConversation.customerName,
                issueType: normalizedConversation.issueType,
                customerPhone: normalizedConversation.customerPhone,
              });
              continue;
            }

            const alreadyPresent = currentList.items.some(item => item.id === normalizedConversation.id);
            if (alreadyPresent) {
              debugQueueSocket('skipped query entry - item already present', {
                queryKey,
                complaintId: normalizedConversation.id,
              });
              continue;
            }

            const pageSize = currentList.pageSize;
            const nextItems = [normalizedConversation, ...currentList.items];
            const trimmedItems = nextItems.slice(0, pageSize);
            const nextStats = incrementStats(currentList.stats, normalizedConversation.apiStatus);

            queryClient.setQueryData<ConversationListResponse>(queryKey, {
              ...currentList,
              total: currentList.total + 1,
              items: trimmedItems,
              stats: nextStats,
            });

            debugQueueSocket('query cache updated with realtime complaint', {
              queryKey,
              complaintId: normalizedConversation.id,
              nextTotal: currentList.total + 1,
              nextItemsLength: trimmedItems.length,
            });
          }
        } else {
          debugQueueSocket('message skipped - normalization returned null');
        }

        void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all, refetchType: 'inactive' });
        debugQueueSocket('invalidated inactive complaint queries after realtime insert');
      };

      socket.onclose = event => {
        socketRef.current = null;
        debugQueueSocket('socket closed', { code: event.code, reason: event.reason });

        if (isUnmountingRef.current) {
          debugQueueSocket('socket close ignored - component unmounting');
          return;
        }

        if (event.code === SOCKET_CLOSURE_UNAUTHORIZED) {
          toast.error('Complaint queue session expired. Please login again.');
          return;
        }

        if (reconnectAttemptsRef.current >= MAX_SOCKET_RETRIES) {
          return;
        }

        const retryDelay = RETRY_DELAY_MS_BASE * 2 ** reconnectAttemptsRef.current;
        reconnectAttemptsRef.current += 1;
        debugQueueSocket('reconnecting queue socket', {
          attempt: reconnectAttemptsRef.current,
          retryDelay,
        });

        clearReconnectTimer();
        reconnectTimerRef.current = window.setTimeout(() => {
          connect();
        }, retryDelay);
      };
    };

    connect();

    return () => {
      isUnmountingRef.current = true;
      clearReconnectTimer();

      if (socketRef.current) {
        socketRef.current.close(SOCKET_NORMAL_CLOSURE, 'complaints-queue-view-change');
        socketRef.current = null;
        debugQueueSocket('socket closed on cleanup');
      }
    };
  }, [enabled, queryClient, token]);
};
