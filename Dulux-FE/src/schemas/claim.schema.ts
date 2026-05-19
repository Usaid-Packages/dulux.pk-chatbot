import { z } from 'zod';

import {
  CLAIM_VOUCHER_ALLOWED_MIME_TYPES,
  CLAIM_VOUCHER_FILE_REQUIRED_MESSAGE,
  CLAIM_VOUCHER_FILE_TYPE_MESSAGE,
  NOTES_MAX_LENGTH,
} from '#/constants';
import {
  CLAIM_CSR_RESUBMISSION_INPUT_TYPES,
  CLAIM_ISSUE_TYPES,
  CLAIM_STATUSES,
  CLAIM_WORKFLOW_STATES,
} from '#/types/claims.types';

export const claimStatusSchema = z.enum(CLAIM_STATUSES);
export const claimWorkflowStateSchema = z.enum(CLAIM_WORKFLOW_STATES);
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

export const claimResubmissionEntrySchema = z.object({
  id: z.string().min(1),
  requiredItem: z.string().min(1),
  responseText: z.string(),
  imageUrl: z.string().url().optional(),
  createdAt: z.string().min(1),
});

export const claimLatestResubmissionSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  notes: z.string(),
  createdAt: z.string().min(1),
  entries: claimResubmissionEntrySchema.array(),
});

export const linkedRegistrationSummarySchema = z.object({
  registrationId: z.string().min(1),
  registrationRecordId: z.string().min(1),
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
  workflowState: claimWorkflowStateSchema,
  status: claimStatusSchema,
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
  latestResubmission: claimLatestResubmissionSchema.optional(),
});

export const claimsStatsSchema = z.object({
  totalClaims: z.number().int().nonnegative(),
  pendingReview: z.number().int().nonnegative(),
  forwardedToQuality: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
});

export const claimsCardCountsSchema = z.object({
  totalClaims: z.number().int().nonnegative(),
  submitted: z.number().int().nonnegative(),
  approved: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
});

export const claimsListResponseSchema = z.object({
  items: claimListItemSchema.array(),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  stats: claimsStatsSchema,
});

const CLAIM_CREATE_ISSUE_TYPES = [
  'PEELING_CRACKING',
  'COLOR_FADING',
  'ALGAE_FUNGUS',
  'WATER_INGRESS',
  'COVERAGE_VARIANCE',
  'NON_UNIFORM_FINISH',
  'OTHERS',
] as const;

export const createClaimSchema = z.object({
  registrationId: z.string().min(1, 'Registration is required.'),
  paintPairId: z.string(),
  topcoatProductId: z.string().min(1, 'Topcoat product is required.'),
  basecoatProductId: z.string().optional(),
  issueType: z.enum(CLAIM_CREATE_ISSUE_TYPES),
  affectedAreaSqft: z.coerce.number().positive('Affected area must be greater than zero.'),
  notes: z.string().trim().max(NOTES_MAX_LENGTH, `Notes must be ${NOTES_MAX_LENGTH} characters or fewer.`).optional(),
  longShotPhoto: z.instanceof(File, { message: 'Long shot photo is required.' }),
  closeShotPhoto: z.instanceof(File, { message: 'Close shot photo is required.' }),
  alternateAnglePhoto: z.instanceof(File, { message: 'Alternate angle photo is required.' }),
});

export const forwardToQualitySchema = z.object({
  notes: z.string().trim().max(NOTES_MAX_LENGTH, `Notes must be ${NOTES_MAX_LENGTH} characters or fewer.`).optional(),
});

export const approveClaimFinalSchema = z.object({
  notes: z.string().trim().max(NOTES_MAX_LENGTH, `Notes must be ${NOTES_MAX_LENGTH} characters or fewer.`).optional(),
  voucher: z
    .instanceof(File, { message: CLAIM_VOUCHER_FILE_REQUIRED_MESSAGE })
    .refine(file => CLAIM_VOUCHER_ALLOWED_MIME_TYPES.includes(file.type), {
      message: CLAIM_VOUCHER_FILE_TYPE_MESSAGE,
    }),
});

export const rejectClaimFinalSchema = z.object({
  notes: z.string().trim().min(10, 'Final rejection notes are required.').max(NOTES_MAX_LENGTH),
});

export const requestMoreInfoSchema = z.object({
  items: z.array(z.string().min(1)).min(1, 'Select at least one item.'),
  note: z.string().trim().max(NOTES_MAX_LENGTH, `Note must be ${NOTES_MAX_LENGTH} characters or fewer.`).optional(),
});

const csrResubmissionRequestedItemSchema = z.object({
  requiredItem: z.string().min(1),
  label: z.string().min(1),
  inputType: z.enum(CLAIM_CSR_RESUBMISSION_INPUT_TYPES),
  isMultiple: z.boolean(),
});

export const claimCsrResubmissionRequestSchema = z.object({
  claimId: z.string().min(1),
  claimState: claimWorkflowStateSchema,
  qualityReviewId: z.string().min(1),
  qualityNotes: z.string(),
  otherText: z.string(),
  requestedItems: z.array(csrResubmissionRequestedItemSchema).min(1),
  created: z.string().min(1),
});

export const claimCsrResubmissionFormSchema = z
  .object({
    notes: z.string().trim().max(2000, 'Notes must be 2000 characters or fewer.').optional(),
    entries: z
      .array(
        z.object({
          requiredItem: z.string().min(1),
          inputType: z.enum(CLAIM_CSR_RESUBMISSION_INPUT_TYPES),
          responseText: z.string().trim().max(2000, 'Response must be 2000 characters or fewer.').optional(),
          imageFile: z.instanceof(File).optional(),
        })
      )
      .min(1, 'At least one resubmission entry is required.'),
  })
  .superRefine((values, context) => {
    values.entries.forEach((entry, index) => {
      if (entry.inputType === 'TEXT' && !entry.responseText?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['entries', index, 'responseText'],
          message: 'Response text is required for this field.',
        });
      }

      if (entry.inputType === 'IMAGE' && !entry.imageFile) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['entries', index, 'imageFile'],
          message: 'An image is required for this field.',
        });
      }
    });
  });

export type CreateClaimFormValues = z.infer<typeof createClaimSchema>;
export type ForwardToQualityFormValues = z.infer<typeof forwardToQualitySchema>;
export type ApproveClaimFinalFormValues = z.infer<typeof approveClaimFinalSchema>;
export type RejectClaimFinalFormValues = z.infer<typeof rejectClaimFinalSchema>;
export type RequestMoreInfoFormValues = z.infer<typeof requestMoreInfoSchema>;
export type ClaimCsrResubmissionFormValues = z.infer<typeof claimCsrResubmissionFormSchema>;
