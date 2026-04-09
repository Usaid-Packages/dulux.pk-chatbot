import { z } from 'zod';

import { AUDIT_LOG_ACTIONS } from '#/types/auditLogs';

export const auditLogActionSchema = z.enum(AUDIT_LOG_ACTIONS);

const auditLogSnapshotSchema = z.record(z.string(), z.unknown());

export const auditLogListItemSchema = z.object({
  id: z.number().int().nonnegative(),
  actor: z.number().int().nullable(),
  actorEmail: z.string().trim().min(1),
  action: auditLogActionSchema,
  modelLabel: z.string().trim().min(1),
  objectId: z.string().trim().min(1),
  objectRepr: z.string().trim().min(1),
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
