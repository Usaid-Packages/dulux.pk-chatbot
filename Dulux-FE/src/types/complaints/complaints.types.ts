export const CONVERSATION_STATUSES = ['unassigned', 'active', 'resolved'] as const;
export const CONVERSATION_PRIORITIES = ['normal', 'high'] as const;
export const CONVERSATION_CHANNELS = ['whatsapp', 'manual'] as const;
export const MESSAGE_KINDS = ['customer', 'agent', 'system'] as const;
export const ESCALATION_LEVELS = ['L1', 'L2', 'L3'] as const;
export const ESCALATION_URGENCIES = ['normal', 'high', 'critical'] as const;
export const TRANSFER_TARGETS = ['agent', 'queue'] as const;

export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];
export type ConversationPriority = (typeof CONVERSATION_PRIORITIES)[number];
export type ConversationChannel = (typeof CONVERSATION_CHANNELS)[number];
export type MessageKind = (typeof MESSAGE_KINDS)[number];
export type EscalationLevel = (typeof ESCALATION_LEVELS)[number];
export type EscalationUrgency = (typeof ESCALATION_URGENCIES)[number];
export type TransferTarget = (typeof TRANSFER_TARGETS)[number];
export type ConversationStatusFilter = 'all' | ConversationStatus;
export type ConversationPriorityFilter = 'all' | ConversationPriority;

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
  city: string;
  issueType: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  channel: ConversationChannel;
  unreadCount: number;
  assignedAgent?: string;
  lastMessagePreview: string;
  lastMessageAt: string;
}

export interface ConversationThread extends ConversationListItem {
  ticketId: string;
  submittedAt: string;
  registrationId: string;
  customerPhone: string;
  whatsappConnected: boolean;
  affectedAreaSqFt?: number;
  topcoat?: string;
  dealerName?: string;
  escalationLevel?: EscalationLevel;
  lastTransferredAt?: string;
  lastResolvedAt?: string;
  customerHistory: {
    registrations: number;
    claims: number;
    pastComplaints: number;
  };
  messages: ChatMessage[];
}

export interface ConversationStats {
  totalConversations: number;
  unassigned: number;
  active: number;
  resolved: number;
  unreadMessages: number;
}

export interface ConversationListRequestParams {
  status: ConversationStatusFilter;
  priority: ConversationPriorityFilter;
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

export interface MarkThreadReadPayload extends Record<string, unknown> {
  threadId: string;
}

export interface ResolveConversationPayload extends Record<string, unknown> {
  threadId: string;
  resolutionType: 'issueResolved' | 'needQualityFollowUp';
  summary: string;
  notifyCustomer: boolean;
}

export interface TransferConversationPayload extends Record<string, unknown> {
  threadId: string;
  transferTo: TransferTarget;
  agentId?: string;
  queueName?: string;
  reason: string;
  internalNote?: string;
  ccCurrentAgent: boolean;
}

export interface EscalateConversationPayload extends Record<string, unknown> {
  threadId: string;
  level: EscalationLevel;
  reason: string;
  urgency: EscalationUrgency;
  description: string;
}
