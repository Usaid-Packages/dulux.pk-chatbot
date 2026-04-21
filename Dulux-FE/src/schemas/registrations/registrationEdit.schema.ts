import { z } from 'zod';

import { MANUAL_REGISTRATION_ALLOWED_FILE_TYPES, MANUAL_REGISTRATION_MAX_FILE_SIZE_BYTES } from '#/constants';

const phonePattern = /^923\d{9}$/;
const quantityPattern = /^\d+(\.\d{1,2})?$/;

const invoiceFileSchema = z
  .instanceof(File, { message: 'Please upload a valid file.' })
  .refine(file => file.size <= MANUAL_REGISTRATION_MAX_FILE_SIZE_BYTES, 'Max file size is 5MB.')
  .refine(
    file =>
      MANUAL_REGISTRATION_ALLOWED_FILE_TYPES.includes(
        file.type as (typeof MANUAL_REGISTRATION_ALLOWED_FILE_TYPES)[number]
      ),
    'Only JPG and PNG files are allowed.'
  );

const registrationEditPaintPairSchema = z
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

export const registrationEditSchema = z
  .object({
    customerName: z.string().trim().min(1, 'Customer name is required.').max(120, 'Customer name is too long.'),
    phoneNumber: z.string().trim().regex(phonePattern, 'Phone number must be in 923XXXXXXXXX format.'),
    email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
    city: z.string().trim().min(1, 'City is required.').max(80, 'City is too long.'),
    province: z.string().trim().min(1, 'Province is required.'),
    siteAddress: z.string().trim().min(1, 'Site address is required.').max(180, 'Site address is too long.'),
    purchaseDate: z.string().trim().min(1, 'Purchase date is required.'),
    purchaseDealer: z.string().trim().min(1, 'Dealer name is required.').max(120, 'Dealer name is too long.'),
    purchaseDealerCity: z.string().trim().min(1, 'Dealer city is required.').max(80, 'Dealer city is too long.'),
    purchaseDealerAddress: z
      .string()
      .trim()
      .min(1, 'Dealer address is required.')
      .max(180, 'Dealer address is too long.'),
    postalCode: z.string().trim().max(20, 'Postal code is too long.').optional(),
    paintPairs: z.array(registrationEditPaintPairSchema).min(1, 'At least one paint pair is required.'),
    existingInvoiceImageIds: z.array(z.number().int().nonnegative()),
    invoiceFiles: z.array(invoiceFileSchema),
  })
  .superRefine((values, context) => {
    if (values.existingInvoiceImageIds.length + values.invoiceFiles.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['existingInvoiceImageIds'],
        message: 'At least one invoice image is required.',
      });
    }
  });

export type RegistrationEditFormValues = z.infer<typeof registrationEditSchema>;
