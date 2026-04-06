import { z } from 'zod';

import { MANUAL_REGISTRATION_ALLOWED_FILE_TYPES, MANUAL_REGISTRATION_MAX_FILE_SIZE_BYTES } from '#/constants';

const quantityPattern = /^\d+(\.\d{1,2})?$/;

const fileSchema = z
  .instanceof(File, { message: 'Please upload a valid file.' })
  .refine(file => file.size <= MANUAL_REGISTRATION_MAX_FILE_SIZE_BYTES, 'Max file size is 5MB.')
  .refine(
    file =>
      MANUAL_REGISTRATION_ALLOWED_FILE_TYPES.includes(
        file.type as (typeof MANUAL_REGISTRATION_ALLOWED_FILE_TYPES)[number]
      ),
    'Only JPG, PNG, or PDF files are allowed.'
  );

const manualRegistrationBaseSchema = z.object({
  customerName: z.string().trim().min(2, 'Customer name is required.'),
  phoneNumber: z
    .string()
    .trim()
    .min(10, 'Phone number must be at least 10 digits.')
    .max(20, 'Phone number is too long.'),
  email: z.string().trim().min(1, 'Email is required.').pipe(z.email('Please enter a valid email address.')),
  city: z.string().trim().min(2, 'City is required.'),
  province: z.string().trim().min(2, 'Province is required.'),
  siteAddress: z.string().trim().min(5, 'Site address is required.'),
  postalCode: z.string().trim().min(3, 'Postal code is required.'),
  purchaseDate: z.string().trim().min(1, 'Purchase date is required.'),
  purchaseDealer: z.string().trim().min(2, 'Dealer name is required.'),
  purchaseDealerCity: z.string().trim().min(2, 'Dealer city is required.'),
  purchaseDealerAddress: z.string().trim().min(5, 'Dealer address is required.'),
  notes: z.string().trim().max(500, 'Notes must be 500 characters or less.'),
  topcoatProductId: z.string().trim().min(1, 'Topcoat product is required.'),
  topcoatQuantity: z
    .string()
    .trim()
    .min(1, 'Topcoat quantity is required.')
    .regex(quantityPattern, 'Enter a valid quantity (e.g., 5 or 5.5).'),
  basecoatProductId: z.string().trim(),
  basecoatQuantity: z.string().trim(),
  topcoatInvoice: fileSchema,
  basecoatInvoice: fileSchema.nullable(),
});

export const manualRegistrationSchema = manualRegistrationBaseSchema.superRefine((values, context) => {
  if (values.basecoatProductId && !values.basecoatQuantity) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['basecoatQuantity'],
      message: 'Basecoat quantity is required when basecoat is selected.',
    });
  }

  if (values.basecoatQuantity && !values.basecoatProductId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['basecoatProductId'],
      message: 'Select a basecoat product before adding quantity.',
    });
  }

  if (values.basecoatQuantity && !quantityPattern.test(values.basecoatQuantity)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['basecoatQuantity'],
      message: 'Enter a valid quantity (e.g., 5 or 5.5).',
    });
  }

  if (values.basecoatProductId && !values.basecoatInvoice) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['basecoatInvoice'],
      message: 'Basecoat invoice is required when basecoat is selected.',
    });
  }
});

export const manualRegistrationStep1Schema = manualRegistrationBaseSchema.pick({
  customerName: true,
  phoneNumber: true,
  email: true,
  city: true,
  province: true,
  siteAddress: true,
  postalCode: true,
});

export const manualRegistrationStep2Schema = manualRegistrationBaseSchema.pick({
  purchaseDate: true,
  purchaseDealer: true,
  purchaseDealerCity: true,
  purchaseDealerAddress: true,
  notes: true,
});

export const manualRegistrationStep3Schema = manualRegistrationBaseSchema.pick({
  topcoatProductId: true,
  topcoatQuantity: true,
  basecoatProductId: true,
  basecoatQuantity: true,
});

export const manualRegistrationStep4Schema = manualRegistrationBaseSchema.pick({
  topcoatInvoice: true,
  basecoatInvoice: true,
  basecoatProductId: true,
});

export type ManualRegistrationSchemaValues = z.infer<typeof manualRegistrationSchema>;
