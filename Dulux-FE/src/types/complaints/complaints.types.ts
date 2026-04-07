export const CONVERSATION_STATUSES = ['active', 'resolved'] as const;
export const CONVERSATION_CHANNELS = ['whatsapp', 'manual'] as const;
export const MESSAGE_KINDS = ['customer', 'agent', 'system'] as const;
export const COMPLAINT_API_STATUS_VALUES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

export const COMPLAINT_ACTIONS = {
  ASSIGN: 'ASSIGN',
  RESOLVE: 'RESOLVE',
  CLOSE: 'CLOSE',
  REOPEN: 'REOPEN',
} as const;

export const COMPLAINT_API_STATUSES = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;

export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];
export type ConversationChannel = (typeof CONVERSATION_CHANNELS)[number];
export type MessageKind = (typeof MESSAGE_KINDS)[number];
export type ConversationStatusFilter = 'all' | ComplaintApiStatus;
export type ComplaintAction = (typeof COMPLAINT_ACTIONS)[keyof typeof COMPLAINT_ACTIONS];
export type ComplaintApiStatus = (typeof COMPLAINT_API_STATUS_VALUES)[number];

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  kind: MessageKind;
  senderName: string;
  text: string;
  createdAt: string;
  attachments?: ChatAttachment[];
}

export interface ConversationListItem {
  id: string;
  claimNumber: string;
  customerName: string;
  customerPhone: string;
  city: string;
  issueType: string;
  apiStatus: ComplaintApiStatus;
  status: ConversationStatus;
  channel: ConversationChannel;
  unreadCount: number;
  assignedToId?: number | null;
  assignedAgent?: string;
  lastMessagePreview: string;
  lastMessageAt: string;
}

export interface ConversationThread extends ConversationListItem {
  ticketId: string;
  submittedAt: string;
  registrationId: string;
  customerPhone: string;
  description?: string;
  closureNote?: string;
  closedAt?: string | null;
  whatsappConnected: boolean;
  affectedAreaSqFt?: number;
  topcoat?: string;
  dealerName?: string;
  lastResolvedAt?: string;
  customerHistory: {
    registrations: number;
    claims: number;
    pastComplaints: number;
  };
  complaintImages: ChatAttachment[];
  messages: ChatMessage[];
}

export interface ConversationStats {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

export interface ConversationListRequestParams {
  status: ConversationStatusFilter;
  search?: string;
  page: number;
  pageSize: number;
}

export interface ConversationListResponse {
  items: ConversationListItem[];
  total: number;
  page: number;
  pageSize: number;
  stats: ConversationStats;
}

export interface SendMessagePayload extends Record<string, unknown> {
  threadId: string;
  message: string;
}

export interface ComplaintApiMessage extends Record<string, unknown> {
  id: string | number;
  sender?: string;
  text: string;
  created?: string;
  createdAt?: string;
}

export interface ComplaintListApiItem extends Record<string, unknown> {
  id: number;
  registrationNumber?: string;
  phoneNumber: string;
  customerName: string;
  subject: string;
  status: ComplaintApiStatus;
  assignedTo?: number | null;
  assignedToEmail?: string | null;
  created: string;
}

export interface ComplaintListApiResponse extends Record<string, unknown> {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: ComplaintListApiItem[];
}

export interface ComplaintDetailApiImage extends Record<string, unknown> {
  id: number;
  image?: {
    id: number;
    image: string;
    created: string;
  } | null;
  created: string;
}

export interface ComplaintDetailApiResponse extends Record<string, unknown> {
  id: number;
  registration?: number | null;
  registrationNumber?: string;
  phoneNumber: string;
  customerName: string;
  subject: string;
  description?: string;
  status: ComplaintApiStatus;
  assignedTo?: number | null;
  assignedToEmail?: string | null;
  closedAt?: string | null;
  closureNote?: string;
  images?: ComplaintDetailApiImage[];
  messages?: ComplaintApiMessage[];
  created: string;
  modified?: string;
}

export interface ResolveConversationPayload extends Record<string, unknown> {
  threadId: string;
}

export interface CloseConversationPayload extends Record<string, unknown> {
  threadId: string;
  closureNote: string;
}
