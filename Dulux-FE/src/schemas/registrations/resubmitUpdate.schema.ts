import { z } from 'zod';

const quantityPattern = /^\d+(\.\d{1,2})?$/;
const phonePattern = /^923\d{9}$/;

export const resubmitUpdatePaintPairSchema = z
  .object({
    selectionType: z.enum(['SPECIALIST', 'TOPCOAT', '']).default(''),
    topcoatId: z.string().trim(),
    topcoatQuantity: z.string().trim(),
    basecoatId: z.string().trim(),
    basecoatQuantity: z.string().trim(),
  })
  .superRefine((value, context) => {
    if (!value.selectionType) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectionType'],
        message: 'Select paint type first.',
      });
      return;
    }

    if (value.selectionType === 'SPECIALIST' && (value.basecoatId.length > 0 || value.basecoatQuantity.length > 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['basecoatId'],
        message: 'Basecoat is not allowed for specialized paint.',
      });
    }

    if (value.selectionType === 'SPECIALIST' && value.topcoatId.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['topcoatId'],
        message: 'Specialist product is required.',
      });
    }

    if (value.selectionType === 'SPECIALIST' && value.topcoatQuantity.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['topcoatQuantity'],
        message: 'Specialist quantity is required.',
      });
    }

    if (
      value.selectionType === 'SPECIALIST' &&
      value.topcoatQuantity.length > 0 &&
      !quantityPattern.test(value.topcoatQuantity)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['topcoatQuantity'],
        message: 'Enter a valid quantity (e.g., 5 or 5.5).',
      });
    }

    if (value.selectionType === 'TOPCOAT' && value.topcoatId.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['topcoatId'],
        message: 'Topcoat product is required.',
      });
    }

    if (value.selectionType === 'TOPCOAT' && value.topcoatQuantity.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['topcoatQuantity'],
        message: 'Topcoat quantity is required.',
      });
    }

    if (
      value.selectionType === 'TOPCOAT' &&
      value.topcoatQuantity.length > 0 &&
      !quantityPattern.test(value.topcoatQuantity)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['topcoatQuantity'],
        message: 'Enter a valid quantity (e.g., 5 or 5.5).',
      });
    }

    if (value.selectionType === 'TOPCOAT' && value.basecoatId.length > 0 && value.basecoatQuantity.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['basecoatQuantity'],
        message: 'Basecoat quantity is required when a basecoat product is selected.',
      });
    }

    if (value.selectionType === 'TOPCOAT' && value.basecoatQuantity.length > 0 && value.basecoatId.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['basecoatId'],
        message: 'Basecoat product is required when basecoat quantity is provided.',
      });
    }

    if (
      value.selectionType === 'TOPCOAT' &&
      value.basecoatQuantity.length > 0 &&
      !quantityPattern.test(value.basecoatQuantity)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['basecoatQuantity'],
        message: 'Enter a valid quantity (e.g., 5 or 5.5).',
      });
    }
  });

export const resubmitUpdateSchema = z.object({
  customerName: z.string().trim().optional(),
  phoneNumber: z
    .string()
    .trim()
    .optional()
    .refine(value => (value ? phonePattern.test(value) : true), 'Phone number must be in 923XXXXXXXXX format.'),
  email: z.string().trim().optional(),
  city: z.string().trim().optional(),
  siteAddress: z.string().trim().optional(),
  purchaseDate: z.string().trim().optional(),
  purchaseDealer: z.string().trim().optional(),
  purchaseDealerCity: z.string().trim().optional(),
  purchaseDealerAddress: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  paintPairs: z.array(resubmitUpdatePaintPairSchema),
  invoiceFiles: z.array(z.instanceof(File)),
});

export type ResubmitUpdateFormValues = z.infer<typeof resubmitUpdateSchema>;
