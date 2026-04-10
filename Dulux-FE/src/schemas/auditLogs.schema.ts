import { z } from 'zod';

import { AUDIT_LOG_ACTIONS } from '#/types/auditLogs';

export const auditLogActionSchema = z.enum(AUDIT_LOG_ACTIONS);

const auditLogSnapshotSchema = z.record(z.string(), z.unknown());

export const auditLogListItemSchema = z.object({
  id: z.number().int().nonnegative(),
  actor: z.number().int().nullable(),
  actorEmail: z.string().trim().min(1),
  action: auditLogActionSchema,
  objectId: z.string().trim().min(1),
  objectRepr: z.string().trim().min(1),
  eventLabel: z.string().trim().min(1),
  registrationNumber: z.string().trim().min(1).nullable(),
  created: z.string().trim().min(1),
});

export const auditLogChangeSchema = z.object({
  before: z.unknown(),
  after: z.unknown(),
});

export const auditLogDetailSchema = auditLogListItemSchema.extend({
  changes: z.record(z.string(), auditLogChangeSchema).nullable(),
  beforeData: auditLogSnapshotSchema.nullable(),
  afterData: auditLogSnapshotSchema.nullable(),
});

export const auditLogListResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  items: auditLogListItemSchema.array(),
});

export const auditTimelineChangeSchema = z.object({
  before: z.unknown(),
  after: z.unknown(),
});

export const auditTimelineItemSchema = z.object({
  id: z.number().int().nonnegative(),
  user: z.string().trim().min(1),
  actorEmail: z.string().trim().min(1),
  action: auditLogActionSchema,
  eventType: z.string().trim().min(1),
  performedAt: z.string().trim().min(1),
  updatedFields: z.array(z.string().trim().min(1)),
  changes: z.record(z.string(), auditTimelineChangeSchema).nullable(),
  registrationNumber: z.string().trim().min(1).nullable(),
});

export const auditTimelineResponseSchema = z.object({
  results: z.array(auditTimelineItemSchema),
});
