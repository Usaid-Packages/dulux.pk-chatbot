import { z } from 'zod';

import { claimDetailSchema, claimPrioritySchema, claimStatusSchema } from '#/schemas/claim.schema';
import { QUALITY_REQUEST_FROM_OPTIONS } from '#/types/quality.types';

export const qualityQueueItemSchema = z.object({
  id: z.string().min(1),
  claimNumber: z.string().min(1),
  customerName: z.string().min(1),
  issueType: z.string().min(1),
  city: z.string().min(1),
  priority: claimPrioritySchema,
  status: claimStatusSchema,
  forwardedBy: z.string().min(1),
  forwardedAt: z.string().min(1),
  submittedAt: z.string().min(1),
});

export const qualityQueueStatsSchema = z.object({
  totalInQueue: z.number().int().nonnegative(),
  awaitingReview: z.number().int().nonnegative(),
  infoRequested: z.number().int().nonnegative(),
  resolvedToday: z.number().int().nonnegative(),
});

export const qualityQueueResponseSchema = z.object({
  items: qualityQueueItemSchema.array(),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  stats: qualityQueueStatsSchema,
});

export const qualityDetailSchema = claimDetailSchema.extend({
  forwardedBy: z.string().min(1),
  forwardedAt: z.string().min(1),
});

export const qualityApproveSchema = z.object({
  assessment: z.string().trim().min(1, 'Technical assessment is required.'),
  notes: z.string().trim().max(300, 'Notes must be 300 characters or fewer.').optional(),
});

export const qualityRejectSchema = z.object({
  reason: z.string().trim().min(1, 'Rejection reason is required.'),
  technicalNotes: z.string().trim().min(1, 'Technical notes are required.').max(300),
});

export const qualityRequestInfoSchema = z.object({
  items: z.array(z.string().trim().min(1)).min(1, 'Select at least one item.'),
  notes: z.string().trim().max(300, 'Notes must be 300 characters or fewer.').optional(),
  requestFrom: z.enum(QUALITY_REQUEST_FROM_OPTIONS),
});

export type QualityApproveFormValues = z.infer<typeof qualityApproveSchema>;
export type QualityRejectFormValues = z.infer<typeof qualityRejectSchema>;
export type QualityRequestInfoFormValues = z.infer<typeof qualityRequestInfoSchema>;
