import type {
  ConversationListItem,
  ConversationListRequestParams,
  ConversationListResponse,
  ConversationStats,
  ConversationThread,
  EscalateConversationPayload,
  MarkThreadReadPayload,
  ResolveConversationPayload,
  SendMessagePayload,
  TransferConversationPayload,
} from '#/types/complaints';

const nowIso = (): string => new Date().toISOString();

const cloneThread = (thread: ConversationThread): ConversationThread => {
  return {
    ...thread,
    customerHistory: {
      ...thread.customerHistory,
    },
    messages: thread.messages.map(message => ({
      ...message,
      attachments: message.attachments?.map(attachment => ({ ...attachment })),
    })),
  };
};

const pushSystemMessage = (thread: ConversationThread, text: string): void => {
  const timestamp = nowIso();
  const messageId = `m-${thread.id}-${thread.messages.length + 1}`;

  thread.messages.push({
    id: messageId,
    threadId: thread.id,
    kind: 'system',
    senderName: 'System',
    text,
    createdAt: timestamp,
  });

  thread.lastMessagePreview = text;
  thread.lastMessageAt = timestamp;
};

const toListItem = (thread: ConversationThread): ConversationListItem => {
  const latestMessage = thread.messages.at(-1);
  const latestPreview = latestMessage?.text ?? thread.lastMessagePreview;
  const latestTimestamp = latestMessage?.createdAt ?? thread.lastMessageAt;

  return {
    id: thread.id,
    claimNumber: thread.claimNumber,
    customerName: thread.customerName,
    city: thread.city,
    issueType: thread.issueType,
    status: thread.status,
    priority: thread.priority,
    channel: thread.channel,
    unreadCount: thread.unreadCount,
    assignedAgent: thread.assignedAgent,
    lastMessagePreview: latestPreview,
    lastMessageAt: latestTimestamp,
  };
};

const sortByLatestMessage = (left: ConversationThread, right: ConversationThread): number => {
  const rightTime = new Date(right.lastMessageAt).getTime();
  const leftTime = new Date(left.lastMessageAt).getTime();
  return rightTime - leftTime;
};

const initialThreads: ConversationThread[] = [
  {
    id: 'conv-201',
    ticketId: 'CMP-0034',
    claimNumber: 'CL-204',
    registrationId: 'REG-1890',
    submittedAt: '2026-04-03T08:12:00.000Z',
    customerName: 'Hina Saleem',
    customerPhone: '+92-300-1112233',
    city: 'Karachi',
    issueType: 'Peeling',
    status: 'active',
    priority: 'high',
    channel: 'whatsapp',
    whatsappConnected: true,
    affectedAreaSqFt: 12,
    topcoat: 'Dulux Velvet Touch',
    dealerName: 'Al-Noor Paint House',
    unreadCount: 2,
    assignedAgent: 'Amina Khan',
    customerHistory: {
      registrations: 1,
      claims: 1,
      pastComplaints: 0,
    },
    lastMessagePreview: 'I have shared one more balcony photo.',
    lastMessageAt: '2026-04-03T09:54:00.000Z',
    messages: [
      {
        id: 'm-201-1',
        threadId: 'conv-201',
        kind: 'system',
        senderName: 'System',
        text: 'Conversation started from warranty claim CL-204.',
        createdAt: '2026-04-03T08:12:00.000Z',
      },
      {
        id: 'm-201-2',
        threadId: 'conv-201',
        kind: 'customer',
        senderName: 'Hina Saleem',
        text: 'Paint is still peeling near the balcony edge.',
        createdAt: '2026-04-03T08:16:00.000Z',
      },
      {
        id: 'm-201-3',
        threadId: 'conv-201',
        kind: 'agent',
        senderName: 'Amina Khan',
        text: 'Thanks. Please share one closer image of the damaged section.',
        createdAt: '2026-04-03T08:20:00.000Z',
      },
      {
        id: 'm-201-4',
        threadId: 'conv-201',
        kind: 'customer',
        senderName: 'Hina Saleem',
        text: 'I have shared one more balcony photo.',
        createdAt: '2026-04-03T09:54:00.000Z',
        attachments: [
          {
            id: 'att-201-1',
            name: 'balcony-photo-1.jpg',
            url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1280',
          },
          {
            id: 'att-201-2',
            name: 'balcony-photo-2.jpg',
            url: 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=1280',
          },
        ],
      },
    ],
  },
  {
    id: 'conv-202',
    ticketId: 'CMP-0035',
    claimNumber: 'CL-207',
    registrationId: 'REG-1911',
    submittedAt: '2026-04-03T10:10:00.000Z',
    customerName: 'Imran Haq',
    customerPhone: '+92-334-7771200',
    city: 'Faisalabad',
    issueType: 'Blistering',
    status: 'unassigned',
    priority: 'high',
    channel: 'manual',
    whatsappConnected: true,
    affectedAreaSqFt: 8,
    topcoat: 'Dulux Inspire',
    dealerName: 'Royal Paints',
    unreadCount: 1,
    customerHistory: {
      registrations: 1,
      claims: 0,
      pastComplaints: 1,
    },
    lastMessagePreview: 'Please tell me if this needs a site visit.',
    lastMessageAt: '2026-04-03T10:30:00.000Z',
    messages: [
      {
        id: 'm-202-1',
        threadId: 'conv-202',
        kind: 'system',
        senderName: 'System',
        text: 'Conversation created from manual call-center entry.',
        createdAt: '2026-04-03T10:10:00.000Z',
      },
      {
        id: 'm-202-2',
        threadId: 'conv-202',
        kind: 'customer',
        senderName: 'Imran Haq',
        text: 'Please tell me if this needs a site visit.',
        createdAt: '2026-04-03T10:30:00.000Z',
      },
    ],
  },
  {
    id: 'conv-203',
    ticketId: 'CMP-0031',
    claimNumber: 'CL-205',
    registrationId: 'REG-1875',
    submittedAt: '2026-04-02T11:20:00.000Z',
    customerName: 'Ali Raza',
    customerPhone: '+92-333-8884412',
    city: 'Lahore',
    issueType: 'Discoloration',
    status: 'resolved',
    priority: 'normal',
    channel: 'whatsapp',
    whatsappConnected: false,
    topcoat: 'Dulux Inspire',
    dealerName: 'City Colors',
    unreadCount: 0,
    assignedAgent: 'Kamran Malik',
    lastResolvedAt: '2026-04-02T13:00:00.000Z',
    customerHistory: {
      registrations: 2,
      claims: 1,
      pastComplaints: 1,
    },
    lastMessagePreview: 'Thank you, issue has been resolved.',
    lastMessageAt: '2026-04-02T13:05:00.000Z',
    messages: [
      {
        id: 'm-203-1',
        threadId: 'conv-203',
        kind: 'customer',
        senderName: 'Ali Raza',
        text: 'Color tone is darker than expected.',
        createdAt: '2026-04-02T11:20:00.000Z',
      },
      {
        id: 'm-203-2',
        threadId: 'conv-203',
        kind: 'agent',
        senderName: 'Kamran Malik',
        text: 'We approved replacement and shared guidance with dealer.',
        createdAt: '2026-04-02T12:44:00.000Z',
      },
      {
        id: 'm-203-3',
        threadId: 'conv-203',
        kind: 'customer',
        senderName: 'Ali Raza',
        text: 'Thank you, issue has been resolved.',
        createdAt: '2026-04-02T13:05:00.000Z',
      },
    ],
  },
];

let complaintsStore: ConversationThread[] = initialThreads.map(cloneThread);

const computeStats = (threads: ConversationThread[]): ConversationStats => {
  return {
    totalConversations: threads.length,
    unassigned: threads.filter(thread => thread.status === 'unassigned').length,
    active: threads.filter(thread => thread.status === 'active').length,
    resolved: threads.filter(thread => thread.status === 'resolved').length,
    unreadMessages: threads.reduce((count, thread) => count + thread.unreadCount, 0),
  };
};

const filterThreads = (threads: ConversationThread[], params: ConversationListRequestParams): ConversationThread[] => {
  return threads.filter(thread => {
    const statusMatches = params.status === 'all' ? true : thread.status === params.status;
    const priorityMatches = params.priority === 'all' ? true : thread.priority === params.priority;

    const normalizedSearch = params.search?.trim().toLowerCase() ?? '';
    const searchMatches =
      normalizedSearch.length === 0
        ? true
        : [thread.customerName, thread.claimNumber, thread.registrationId, thread.city]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch);

    return statusMatches && priorityMatches && searchMatches;
  });
};

const paginateThreads = (
  threads: ConversationThread[],
  page: number,
  pageSize: number
): { items: ConversationThread[]; total: number } => {
  const normalizedPage = page < 1 ? 1 : page;
  const start = (normalizedPage - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: threads.slice(start, end),
    total: threads.length,
  };
};

const getThreadById = (threadId: string): ConversationThread => {
  const thread = complaintsStore.find(item => item.id === threadId);
  if (!thread) {
    throw new Error('Conversation thread not found.');
  }

  return thread;
};

export const getMockConversations = (params: ConversationListRequestParams): ConversationListResponse => {
  const sortedThreads = complaintsStore.map(cloneThread).sort(sortByLatestMessage);
  const filteredThreads = filterThreads(sortedThreads, params);
  const paginated = paginateThreads(filteredThreads, params.page, params.pageSize);

  return {
    items: paginated.items.map(toListItem),
    total: paginated.total,
    page: params.page,
    pageSize: params.pageSize,
    stats: computeStats(sortedThreads),
  };
};

export const getMockConversationById = (threadId: string): ConversationThread => {
  return cloneThread(getThreadById(threadId));
};

export const markMockThreadAsRead = (payload: MarkThreadReadPayload): ConversationThread => {
  const targetThread = getThreadById(payload.threadId);
  targetThread.unreadCount = 0;
  return cloneThread(targetThread);
};

export const sendMockMessage = (payload: SendMessagePayload): ConversationThread => {
  const targetThread = getThreadById(payload.threadId);
  const timestamp = nowIso();
  const newMessageId = `m-${targetThread.id}-${targetThread.messages.length + 1}`;

  targetThread.messages.push({
    id: newMessageId,
    threadId: targetThread.id,
    kind: 'agent',
    senderName: targetThread.assignedAgent ?? 'CS Agent',
    text: payload.message.trim(),
    createdAt: timestamp,
  });

  targetThread.status = 'active';
  targetThread.unreadCount = 0;
  targetThread.lastMessagePreview = payload.message.trim();
  targetThread.lastMessageAt = timestamp;

  return cloneThread(targetThread);
};

export const resolveMockConversation = (payload: ResolveConversationPayload): ConversationThread => {
  const targetThread = getThreadById(payload.threadId);

  targetThread.status = 'resolved';
  targetThread.lastResolvedAt = nowIso();
  pushSystemMessage(targetThread, `Conversation marked resolved: ${payload.summary}`);

  return cloneThread(targetThread);
};

export const transferMockConversation = (payload: TransferConversationPayload): ConversationThread => {
  const targetThread = getThreadById(payload.threadId);
  const assignedTarget = payload.transferTo === 'agent' ? (payload.agentId ?? 'Unassigned agent') : payload.queueName;

  targetThread.status = 'active';
  targetThread.assignedAgent = assignedTarget;
  targetThread.lastTransferredAt = nowIso();
  pushSystemMessage(targetThread, `Conversation transferred to ${assignedTarget}. Reason: ${payload.reason}`);

  return cloneThread(targetThread);
};

export const escalateMockConversation = (payload: EscalateConversationPayload): ConversationThread => {
  const targetThread = getThreadById(payload.threadId);

  targetThread.escalationLevel = payload.level;
  targetThread.priority = payload.urgency === 'normal' ? 'normal' : 'high';
  pushSystemMessage(targetThread, `Conversation escalated to ${payload.level} (${payload.reason}).`);

  return cloneThread(targetThread);
};
