import type { Page } from '@playwright/test';

interface ComplaintSocketControl {
  emitQueueEvent: (payload: unknown) => void;
  emitThreadMessage: (threadId: string, payload: unknown) => void;
  forceThreadDisconnect: (threadId: string, code?: number, reason?: string) => void;
  getThreadSocketCount: (threadId: string) => number;
  getThreadOpenSocketCount: (threadId: string) => number;
  getThreadLastSentText: (threadId: string) => string | null;
  setThreadConnectionBlocked: (threadId: string, blocked: boolean) => void;
  setSendFailureEnabled: (enabled: boolean) => void;
}

const INSTALL_SCRIPT = () => {
  type SocketCloseState = 'open' | 'closed';

  interface MockSocketRecord {
    close: (code?: number, reason?: string) => void;
    emitMessage: (payload: unknown) => void;
    getReadyState: () => number;
  }

  interface ControlledSocketWindow extends Window {
    __PW_COMPLAINT_SOCKET__?: ComplaintSocketControl;
    __PW_NATIVE_WEBSOCKET__?: typeof WebSocket;
  }

  const windowWithControl = window as ControlledSocketWindow;

  if (windowWithControl.__PW_COMPLAINT_SOCKET__) {
    return;
  }

  const NativeWebSocket = window.WebSocket;
  const threadSocketMap = new Map<string, Set<MockSocketRecord>>();
  const blockedThreadConnections = new Set<string>();
  const lastSentTextByThread = new Map<string, string>();
  const queueSockets = new Set<MockSocketRecord>();
  let sendFailureEnabled = false;
  let nextMessageId = 1;

  const getThreadIdFromPath = (pathname: string): string | null => {
    const match = pathname.match(/^\/ws\/complaints\/([^/]+)\/chat\/$/);
    return match?.[1] ?? null;
  };

  const isQueuePath = (pathname: string): boolean => pathname === '/ws/complaints/queue/';

  class ControlledComplaintsSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    readonly url!: string;
    readonly threadId!: string;
    readonly isQueueSocket!: boolean;
    readonly readyStateGetter!: () => number;

    onopen: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent<string>) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;

    private readonly eventTarget = new EventTarget();
    private socketState: SocketCloseState = 'closed';
    private currentReadyState = ControlledComplaintsSocket.CONNECTING;

    constructor(url: string) {
      this.url = url;

      const resolvedUrl = new URL(url, window.location.origin);
      const threadId = getThreadIdFromPath(resolvedUrl.pathname);
      const queuePath = isQueuePath(resolvedUrl.pathname);

      if (!threadId && !queuePath) {
        return new NativeWebSocket(url) as unknown as ControlledComplaintsSocket;
      }

      this.threadId = threadId ?? '';
      this.isQueueSocket = queuePath;
      this.readyStateGetter = (): number => this.currentReadyState;
      this.socketState = 'open';
      this.currentReadyState = ControlledComplaintsSocket.CONNECTING;

      const record: MockSocketRecord = {
        close: (code?: number, reason?: string): void => {
          this.internalClose(code, reason);
        },
        emitMessage: (payload: unknown): void => {
          this.emitMessage(payload);
        },
        getReadyState: (): number => this.currentReadyState,
      };

      if (this.isQueueSocket) {
        queueSockets.add(record);
      } else {
        const socketsForThread = threadSocketMap.get(this.threadId) ?? new Set<MockSocketRecord>();
        socketsForThread.add(record);
        threadSocketMap.set(this.threadId, socketsForThread);
      }

      const tryOpenSocket = (): void => {
        if (this.socketState === 'closed') {
          return;
        }

        if (this.threadId && blockedThreadConnections.has(this.threadId)) {
          window.setTimeout(tryOpenSocket, 50);
          return;
        }

        this.currentReadyState = ControlledComplaintsSocket.OPEN;
        const openEvent = new Event('open');
        this.onopen?.(openEvent);
        this.eventTarget.dispatchEvent(openEvent);
      };

      window.setTimeout(tryOpenSocket, 0);

      this.addEventListener = this.eventTarget.addEventListener.bind(this.eventTarget);
      this.removeEventListener = this.eventTarget.removeEventListener.bind(this.eventTarget);
      this.dispatchEvent = this.eventTarget.dispatchEvent.bind(this.eventTarget);
    }

    addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void = () => undefined;
    removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void = () => undefined;
    dispatchEvent: (event: Event) => boolean = () => true;

    get readyState(): number {
      return this.currentReadyState;
    }

    send(data: string): void {
      if (this.currentReadyState !== ControlledComplaintsSocket.OPEN) {
        return;
      }

      let payload: unknown;
      try {
        payload = JSON.parse(data);
      } catch {
        payload = {};
      }

      const payloadRecord = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
      const textValue = typeof payloadRecord.text === 'string' ? payloadRecord.text.trim() : '';
      if (this.threadId.length > 0 && textValue.length > 0) {
        lastSentTextByThread.set(this.threadId, textValue);
      }

      if (sendFailureEnabled) {
        this.emitMessage({
          error: 'Message delivery failed from controlled socket mock.',
          message: {
            id: `delivery-failed-${nextMessageId}`,
            sender: 'SYSTEM',
            text: textValue.length > 0 ? textValue : 'Message',
            created: new Date().toISOString(),
          },
        });
        return;
      }

      const messagePayload = {
        id: `socket-msg-${nextMessageId}`,
        sender: 'CS_AGENT',
        text: textValue.length > 0 ? textValue : 'Message',
        created: new Date().toISOString(),
      };
      nextMessageId += 1;
      this.emitMessage(messagePayload);
    }

    close(code?: number, reason?: string): void {
      this.internalClose(code, reason);
    }

    private emitMessage(payload: unknown): void {
      if (this.currentReadyState !== ControlledComplaintsSocket.OPEN) {
        return;
      }

      const event = new MessageEvent<string>('message', {
        data: JSON.stringify(payload),
      });
      this.onmessage?.(event);
      this.eventTarget.dispatchEvent(event);
    }

    private internalClose(code?: number, reason?: string): void {
      if (this.socketState === 'closed') {
        return;
      }

      this.socketState = 'closed';
      this.currentReadyState = ControlledComplaintsSocket.CLOSED;

      const socketsForThread = threadSocketMap.get(this.threadId);
      if (this.isQueueSocket) {
        for (const queueSocket of Array.from(queueSockets)) {
          if (queueSocket.getReadyState() === ControlledComplaintsSocket.CLOSED) {
            queueSockets.delete(queueSocket);
          }
        }
      } else if (socketsForThread) {
        for (const threadSocket of Array.from(socketsForThread)) {
          if (threadSocket.getReadyState() === ControlledComplaintsSocket.CLOSED) {
            socketsForThread.delete(threadSocket);
          }
        }

        if (socketsForThread.size === 0) {
          threadSocketMap.delete(this.threadId);
        }
      }

      const closeEvent = new CloseEvent('close', {
        code: code ?? 1000,
        reason: reason ?? 'socket-closed-by-test',
      });
      this.onclose?.(closeEvent);
      this.eventTarget.dispatchEvent(closeEvent);
    }
  }

  Object.defineProperty(ControlledComplaintsSocket, 'name', {
    value: 'WebSocket',
  });

  windowWithControl.__PW_NATIVE_WEBSOCKET__ = NativeWebSocket;
  window.WebSocket = ControlledComplaintsSocket as unknown as typeof WebSocket;

  windowWithControl.__PW_COMPLAINT_SOCKET__ = {
    emitQueueEvent: (payload: unknown): void => {
      for (const socketRecord of queueSockets) {
        socketRecord.emitMessage(payload);
      }
    },
    emitThreadMessage: (threadId: string, payload: unknown): void => {
      const socketsForThread = threadSocketMap.get(threadId);
      if (!socketsForThread) {
        return;
      }

      for (const socketRecord of socketsForThread) {
        socketRecord.emitMessage(payload);
      }
    },
    forceThreadDisconnect: (threadId: string, code = 1006, reason = 'forced-disconnect'): void => {
      const socketsForThread = threadSocketMap.get(threadId);
      if (!socketsForThread) {
        return;
      }

      for (const socketRecord of Array.from(socketsForThread)) {
        socketRecord.close(code, reason);
      }
      threadSocketMap.delete(threadId);
    },
    getThreadSocketCount: (threadId: string): number => {
      return threadSocketMap.get(threadId)?.size ?? 0;
    },
    getThreadOpenSocketCount: (threadId: string): number => {
      const socketsForThread = threadSocketMap.get(threadId);
      if (!socketsForThread) {
        return 0;
      }

      let openCount = 0;
      for (const socketRecord of socketsForThread) {
        if (socketRecord.getReadyState() === ControlledComplaintsSocket.OPEN) {
          openCount += 1;
        }
      }

      return openCount;
    },
    getThreadLastSentText: (threadId: string): string | null => {
      return lastSentTextByThread.get(threadId) ?? null;
    },
    setThreadConnectionBlocked: (threadId: string, blocked: boolean): void => {
      if (blocked) {
        blockedThreadConnections.add(threadId);
        return;
      }

      blockedThreadConnections.delete(threadId);
    },
    setSendFailureEnabled: (enabled: boolean): void => {
      sendFailureEnabled = enabled;
    },
  };
};

export const installControlledComplaintsSocketMocks = async (page: Page): Promise<void> => {
  await page.addInitScript(INSTALL_SCRIPT);
};

export const emitComplaintThreadSocketMessage = async (
  page: Page,
  threadId: string,
  payload: Record<string, unknown>
): Promise<void> => {
  await page.evaluate(
    ({ currentThreadId, messagePayload }) => {
      const windowWithControl = window as Window & { __PW_COMPLAINT_SOCKET__?: ComplaintSocketControl };
      windowWithControl.__PW_COMPLAINT_SOCKET__?.emitThreadMessage(currentThreadId, messagePayload);
    },
    { currentThreadId: threadId, messagePayload: payload }
  );
};

export const setComplaintSocketSendFailureEnabled = async (page: Page, enabled: boolean): Promise<void> => {
  await page.evaluate(
    value => {
      const windowWithControl = window as Window & { __PW_COMPLAINT_SOCKET__?: ComplaintSocketControl };
      windowWithControl.__PW_COMPLAINT_SOCKET__?.setSendFailureEnabled(value);
    },
    enabled
  );
};

export const forceComplaintThreadSocketDisconnect = async (
  page: Page,
  threadId: string,
  code = 1006,
  reason = 'forced-disconnect'
): Promise<void> => {
  await page.evaluate(
    ({ currentThreadId, closeCode, closeReason }) => {
      const windowWithControl = window as Window & { __PW_COMPLAINT_SOCKET__?: ComplaintSocketControl };
      windowWithControl.__PW_COMPLAINT_SOCKET__?.forceThreadDisconnect(currentThreadId, closeCode, closeReason);
    },
    { currentThreadId: threadId, closeCode: code, closeReason: reason }
  );
};

export const getComplaintThreadSocketCount = async (page: Page, threadId: string): Promise<number> => {
  return page.evaluate(currentThreadId => {
    const windowWithControl = window as Window & { __PW_COMPLAINT_SOCKET__?: ComplaintSocketControl };
    return windowWithControl.__PW_COMPLAINT_SOCKET__?.getThreadSocketCount(currentThreadId) ?? 0;
  }, threadId);
};

export const getComplaintThreadOpenSocketCount = async (page: Page, threadId: string): Promise<number> => {
  return page.evaluate(currentThreadId => {
    const windowWithControl = window as Window & { __PW_COMPLAINT_SOCKET__?: ComplaintSocketControl };
    return windowWithControl.__PW_COMPLAINT_SOCKET__?.getThreadOpenSocketCount(currentThreadId) ?? 0;
  }, threadId);
};

export const setComplaintThreadConnectionBlocked = async (
  page: Page,
  threadId: string,
  blocked: boolean
): Promise<void> => {
  await page.evaluate(
    ({ currentThreadId, isBlocked }) => {
      const windowWithControl = window as Window & { __PW_COMPLAINT_SOCKET__?: ComplaintSocketControl };
      windowWithControl.__PW_COMPLAINT_SOCKET__?.setThreadConnectionBlocked(currentThreadId, isBlocked);
    },
    { currentThreadId: threadId, isBlocked: blocked }
  );
};

export const getComplaintThreadLastSentText = async (page: Page, threadId: string): Promise<string | null> => {
  return page.evaluate(currentThreadId => {
    const windowWithControl = window as Window & { __PW_COMPLAINT_SOCKET__?: ComplaintSocketControl };
    return windowWithControl.__PW_COMPLAINT_SOCKET__?.getThreadLastSentText(currentThreadId) ?? null;
  }, threadId);
};
