import { z } from 'zod';

import {
  COMPLAINT_API_STATUS_VALUES,
  COMPLAINT_SOCKET_EVENTS,
  CONVERSATION_CHANNELS,
  CONVERSATION_STATUSES,
  MESSAGE_KINDS,
} from '#/types/complaints';

export const complaintApiStatusSchema = z.enum(COMPLAINT_API_STATUS_VALUES);
export const conversationStatusSchema = z.enum(CONVERSATION_STATUSES);
export const conversationChannelSchema = z.enum(CONVERSATION_CHANNELS);
export const messageKindSchema = z.enum(MESSAGE_KINDS);

export const chatAttachmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
});

export const chatMessageSchema = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  kind: messageKindSchema,
  senderName: z.string().min(1),
  text: z.string().min(1),
  createdAt: z.string().min(1),
  attachments: chatAttachmentSchema.array().optional(),
});

export const complaintApiMessageSchema = z.object({
  id: z.union([z.string(), z.number()]),
  sender: z.string().optional(),
  text: z.string().trim().min(1),
  created: z.string().min(1).optional(),
  createdAt: z.string().min(1).optional(),
});

export const complaintQueueSocketEventSchema = z.object({
  event: z.literal(COMPLAINT_SOCKET_EVENTS.COMPLAINT_CREATED),
  complaint: z.record(z.string(), z.unknown()).optional(),
});

export const conversationListItemSchema = z.object({
  id: z.string().min(1),
  claimNumber: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  city: z.string().min(1),
  issueType: z.string().min(1),
  apiStatus: complaintApiStatusSchema,
  status: conversationStatusSchema,
  channel: conversationChannelSchema,
  unreadCount: z.number().int().nonnegative(),
  assignedToId: z.number().int().nullable().optional(),
  assignedAgent: z.string().optional(),
  lastMessagePreview: z.string().min(1),
  lastMessageAt: z.string().min(1),
});

export const conversationThreadSchema = conversationListItemSchema.extend({
  ticketId: z.string().min(1),
  submittedAt: z.string().min(1),
  registrationId: z.string().min(1),
  customerPhone: z.string().min(1),
  description: z.string().optional(),
  closureNote: z.string().optional(),
  closedAt: z.string().nullable().optional(),
  whatsappConnected: z.boolean(),
  affectedAreaSqFt: z.number().positive().optional(),
  topcoat: z.string().min(1).optional(),
  dealerName: z.string().min(1).optional(),
  lastResolvedAt: z.string().min(1).optional(),
  customerHistory: z.object({
    registrations: z.number().int().nonnegative(),
    claims: z.number().int().nonnegative(),
    pastComplaints: z.number().int().nonnegative(),
  }),
  complaintImages: chatAttachmentSchema.array(),
  messages: chatMessageSchema.array(),
});

export const conversationStatsSchema = z.object({
  open: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
  closed: z.number().int().nonnegative(),
});

export const conversationListResponseSchema = z.object({
  items: conversationListItemSchema.array(),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  stats: conversationStatsSchema,
});

export const sendMessageSchema = z.object({
  message: z.string().trim().min(1, 'Message is required.').max(1000, 'Message is too long.'),
});

export type SendMessageFormValues = z.infer<typeof sendMessageSchema>;
