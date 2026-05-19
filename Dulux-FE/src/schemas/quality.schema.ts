import { z } from 'zod';

import { NOTES_MAX_LENGTH } from '#/constants';
import { claimDetailSchema, claimStatusSchema, claimWorkflowStateSchema } from '#/schemas/claim.schema';
import { QUALITY_REQUIRED_ITEMS, QUALITY_TECHNICAL_REASONS } from '#/types/quality.types';

export const qualityQueueItemSchema = z.object({
  id: z.string().min(1),
  claimNumber: z.string().min(1),
  registrationNumber: z.string().min(1),
  customerName: z.string().min(1),
  issueType: z.string().min(1),
  city: z.string().min(1),
  status: claimStatusSchema,
  workflowState: claimWorkflowStateSchema,
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

export const qualityCardCountsSchema = z.object({
  totalInQueue: z.number().int().nonnegative(),
  qaReview: z.number().int().nonnegative(),
  qaApproved: z.number().int().nonnegative(),
  qaRejected: z.number().int().nonnegative(),
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
  technicalNotes: z
    .string()
    .trim()
    .min(10, 'Technical notes must be at least 10 characters.')
    .max(NOTES_MAX_LENGTH, `Technical notes must be ${NOTES_MAX_LENGTH} characters or fewer.`),
});

export const qualityRejectSchema = z.object({
  technicalReason: z.enum(QUALITY_TECHNICAL_REASONS, {
    message: 'Technical reason is required.',
  }),
  technicalNotes: z
    .string()
    .trim()
    .min(10, 'Technical notes must be at least 10 characters.')
    .max(NOTES_MAX_LENGTH, `Technical notes must be ${NOTES_MAX_LENGTH} characters or fewer.`),
});

export const qualityRequestInfoSchema = z.object({
  requiredItems: z.array(z.enum(QUALITY_REQUIRED_ITEMS)).min(1, 'Select at least one required item.'),
  notes: z.string().trim().max(NOTES_MAX_LENGTH, `Notes must be ${NOTES_MAX_LENGTH} characters or fewer.`).optional(),
});

export type QualityApproveFormValues = z.infer<typeof qualityApproveSchema>;
export type QualityRejectFormValues = z.infer<typeof qualityRejectSchema>;
export type QualityRequestInfoFormValues = z.infer<typeof qualityRequestInfoSchema>;
