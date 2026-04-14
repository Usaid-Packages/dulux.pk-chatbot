import { z } from 'zod';

const quantityPattern = /^\d+(\.\d{1,2})?$/;
const phonePattern = /^923\d{9}$/;

export const resubmitUpdatePaintPairSchema = z
  .object({
    topcoatId: z.string().trim().min(1, 'Topcoat product is required.'),
    topcoatQuantity: z
      .string()
      .trim()
      .min(1, 'Topcoat quantity is required.')
      .regex(quantityPattern, 'Enter a valid quantity (e.g., 5 or 5.5).'),
    basecoatId: z.string().trim(),
    basecoatQuantity: z.string().trim(),
  })
  .superRefine((value, context) => {
    if (value.basecoatId.length > 0 && value.basecoatQuantity.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['basecoatQuantity'],
        message: 'Basecoat quantity is required when a basecoat product is selected.',
      });
    }

    if (value.basecoatQuantity.length > 0 && value.basecoatId.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['basecoatId'],
        message: 'Basecoat product is required when basecoat quantity is provided.',
      });
    }

    if (value.basecoatQuantity.length > 0 && !quantityPattern.test(value.basecoatQuantity)) {
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
  province: z.string().trim().optional(),
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
