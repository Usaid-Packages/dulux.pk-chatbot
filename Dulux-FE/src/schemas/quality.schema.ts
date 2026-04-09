import { z } from 'zod';

import { claimDetailSchema, claimPrioritySchema, claimStatusSchema } from '#/schemas/claim.schema';
import { QUALITY_REQUIRED_ITEMS, QUALITY_TECHNICAL_REASONS } from '#/types/quality.types';

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

export const qualityCardCountsSchema = z.object({
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
  latestResubmission: z
    .object({
      id: z.string().min(1),
      source: z.string().min(1),
      notes: z.string(),
      createdAt: z.string().min(1),
      entries: z.array(
        z.object({
          id: z.string().min(1),
          requiredItem: z.string().min(1),
          responseText: z.string(),
          imageUrl: z.string().url().optional(),
          createdAt: z.string().min(1),
        })
      ),
    })
    .optional(),
});

export const qualityApproveSchema = z.object({
  technicalNotes: z.string().trim().min(10, 'Technical notes must be at least 10 characters.'),
});

export const qualityRejectSchema = z.object({
  technicalReason: z.enum(QUALITY_TECHNICAL_REASONS, {
    message: 'Technical reason is required.',
  }),
  technicalNotes: z.string().trim().min(10, 'Technical notes must be at least 10 characters.'),
});

export const qualityRequestInfoSchema = z
  .object({
    requiredItems: z.array(z.enum(QUALITY_REQUIRED_ITEMS)).min(1, 'Select at least one required item.'),
    otherText: z.string().trim().max(300, 'Other details must be 300 characters or fewer.').optional(),
    notes: z.string().trim().max(300, 'Notes must be 300 characters or fewer.').optional(),
  })
  .superRefine((values, ctx) => {
    const hasOtherItem = values.requiredItems.includes('OTHER');
    if (hasOtherItem && !values.otherText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['otherText'],
        message: 'Other details are required when OTHER is selected.',
      });
    }
  });

export type QualityApproveFormValues = z.infer<typeof qualityApproveSchema>;
export type QualityRejectFormValues = z.infer<typeof qualityRejectSchema>;
export type QualityRequestInfoFormValues = z.infer<typeof qualityRequestInfoSchema>;
