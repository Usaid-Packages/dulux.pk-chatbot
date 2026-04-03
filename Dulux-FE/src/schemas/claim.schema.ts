import { z } from 'zod';

import { CLAIM_ISSUE_TYPES, CLAIM_PRIORITIES, CLAIM_STATUSES } from '#/types/claims.types';

export const claimStatusSchema = z.enum(CLAIM_STATUSES);
export const claimPrioritySchema = z.enum(CLAIM_PRIORITIES);
export const claimIssueTypeSchema = z.enum(CLAIM_ISSUE_TYPES);

export const claimTimelineItemSchema = z.object({
  id: z.string().min(1),
  event: z.string().min(1),
  actor: z.string().min(1),
  createdAt: z.string().min(1),
  note: z.string().optional(),
});

export const claimEvidencePhotoSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  url: z.string().url(),
});

export const linkedRegistrationSummarySchema = z.object({
  registrationId: z.string().min(1),
  customerName: z.string().min(1),
  purchaseDate: z.string().min(1),
  dealerName: z.string().min(1),
  status: z.string().min(1),
});

export const claimListItemSchema = z.object({
  id: z.string().min(1),
  claimNumber: z.string().min(1),
  customerName: z.string().min(1),
  registrationId: z.string().min(1),
  issueType: claimIssueTypeSchema,
  photoCount: z.number().int().nonnegative(),
  submittedAt: z.string().min(1),
  status: claimStatusSchema,
  priority: claimPrioritySchema,
});

export const claimDetailSchema = claimListItemSchema.extend({
  phone: z.string().min(1),
  city: z.string().min(1),
  areaSqFt: z.number().positive(),
  topcoat: z.string().min(1),
  batchNumber: z.string().min(1),
  description: z.string().min(1),
  evidencePhotos: claimEvidencePhotoSchema.array(),
  timeline: claimTimelineItemSchema.array(),
  linkedRegistration: linkedRegistrationSummarySchema,
  csNotes: z.string().optional(),
  qualityNotes: z.string().optional(),
  verificationPackSummary: z.string().optional(),
  forwardedBy: z.string().optional(),
  forwardedAt: z.string().optional(),
});

export const claimsStatsSchema = z.object({
  totalClaims: z.number().int().nonnegative(),
  pendingReview: z.number().int().nonnegative(),
  forwardedToQuality: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
});

export const claimsListResponseSchema = z.object({
  items: claimListItemSchema.array(),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  stats: claimsStatsSchema,
});

export const forwardToQualitySchema = z.object({
  notes: z.string().trim().min(8, 'Notes must be at least 8 characters.'),
  priority: claimPrioritySchema,
  verificationPackSummary: z.string().trim().min(5, 'Verification summary is required.'),
});

export const rejectClaimSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required.'),
  notes: z.string().trim().max(300, 'Notes must be 300 characters or fewer.').optional(),
});

const OTHER_REQUEST_INFO_ITEM = 'Other';

export const requestMoreInfoSchema = z
  .object({
    items: z.array(z.string().min(1)).min(1, 'Select at least one item.'),
    otherDetails: z.string().trim().max(200, 'Other details must be 200 characters or fewer.').optional(),
    note: z.string().trim().max(300, 'Note must be 300 characters or fewer.').optional(),
    priority: claimPrioritySchema,
  })
  .superRefine((values, ctx) => {
    const isOtherSelected = values.items.includes(OTHER_REQUEST_INFO_ITEM);
    if (isOtherSelected && !values.otherDetails) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['otherDetails'],
        message: 'Please provide details for Other.',
      });
    }
  });

export type ForwardToQualityFormValues = z.infer<typeof forwardToQualitySchema>;
export type RejectClaimFormValues = z.infer<typeof rejectClaimSchema>;
export type RequestMoreInfoFormValues = z.infer<typeof requestMoreInfoSchema>;
