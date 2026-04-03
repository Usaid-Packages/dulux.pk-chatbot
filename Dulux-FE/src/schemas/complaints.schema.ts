/* eslint import/order: off */
import { z } from 'zod';

import {
  CONVERSATION_CHANNELS,
  CONVERSATION_PRIORITIES,
  CONVERSATION_STATUSES,
  ESCALATION_LEVELS,
  ESCALATION_URGENCIES,
  MESSAGE_KINDS,
  TRANSFER_TARGETS,
} from '#/types/complaints';

export const conversationStatusSchema = z.enum(CONVERSATION_STATUSES);
export const conversationPrioritySchema = z.enum(CONVERSATION_PRIORITIES);
export const conversationChannelSchema = z.enum(CONVERSATION_CHANNELS);
export const messageKindSchema = z.enum(MESSAGE_KINDS);
export const escalationLevelSchema = z.enum(ESCALATION_LEVELS);
export const escalationUrgencySchema = z.enum(ESCALATION_URGENCIES);
export const transferTargetSchema = z.enum(TRANSFER_TARGETS);

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

export const conversationListItemSchema = z.object({
  id: z.string().min(1),
  claimNumber: z.string().min(1),
  customerName: z.string().min(1),
  city: z.string().min(1),
  issueType: z.string().min(1),
  status: conversationStatusSchema,
  priority: conversationPrioritySchema,
  channel: conversationChannelSchema,
  unreadCount: z.number().int().nonnegative(),
  assignedAgent: z.string().optional(),
  lastMessagePreview: z.string().min(1),
  lastMessageAt: z.string().min(1),
});

export const conversationThreadSchema = conversationListItemSchema.extend({
  ticketId: z.string().min(1),
  submittedAt: z.string().min(1),
  registrationId: z.string().min(1),
  customerPhone: z.string().min(1),
  whatsappConnected: z.boolean(),
  affectedAreaSqFt: z.number().positive().optional(),
  topcoat: z.string().min(1).optional(),
  dealerName: z.string().min(1).optional(),
  escalationLevel: escalationLevelSchema.optional(),
  lastTransferredAt: z.string().min(1).optional(),
  lastResolvedAt: z.string().min(1).optional(),
  customerHistory: z.object({
    registrations: z.number().int().nonnegative(),
    claims: z.number().int().nonnegative(),
    pastComplaints: z.number().int().nonnegative(),
  }),
  messages: chatMessageSchema.array(),
});

export const conversationStatsSchema = z.object({
  totalConversations: z.number().int().nonnegative(),
  unassigned: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
  unreadMessages: z.number().int().nonnegative(),
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

export const resolveConversationSchema = z.object({
  resolutionType: z.enum(['issueResolved', 'needQualityFollowUp']),
  summary: z.string().trim().min(8, 'Summary must be at least 8 characters.').max(300, 'Summary is too long.'),
  notifyCustomer: z.boolean(),
});

export const transferConversationSchema = z
  .object({
    transferTo: transferTargetSchema,
    agentId: z.string().trim().optional(),
    queueName: z.string().trim().optional(),
    reason: z.string().trim().min(1, 'Transfer reason is required.'),
    internalNote: z.string().trim().max(300, 'Internal note is too long.').optional(),
    ccCurrentAgent: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.transferTo === 'agent' && !values.agentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['agentId'],
        message: 'Select an agent for transfer.',
      });
    }

    if (values.transferTo === 'queue' && !values.queueName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['queueName'],
        message: 'Queue name is required.',
      });
    }
  });

export const escalateConversationSchema = z.object({
  level: escalationLevelSchema,
  reason: z.string().trim().min(1, 'Escalation reason is required.'),
  urgency: escalationUrgencySchema,
  description: z
    .string()
    .trim()
    .min(8, 'Description must be at least 8 characters.')
    .max(400, 'Description is too long.'),
});

export type SendMessageFormValues = z.infer<typeof sendMessageSchema>;
export type ResolveConversationFormValues = z.infer<typeof resolveConversationSchema>;
export type TransferConversationFormValues = z.infer<typeof transferConversationSchema>;
export type EscalateConversationFormValues = z.infer<typeof escalateConversationSchema>;
