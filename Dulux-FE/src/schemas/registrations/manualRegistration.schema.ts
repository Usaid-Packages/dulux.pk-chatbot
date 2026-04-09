import { z } from 'zod';

import { MANUAL_REGISTRATION_ALLOWED_FILE_TYPES, MANUAL_REGISTRATION_MAX_FILE_SIZE_BYTES } from '#/constants';

const quantityPattern = /^\d+(\.\d{1,2})?$/;
const pakistanPhoneInputPattern = /^923\d{9}$/;
const DEALER_NAME_MAX_LENGTH = 120;
const DEALER_CITY_MAX_LENGTH = 80;
const DEALER_ADDRESS_MAX_LENGTH = 180;
const PURCHASE_DATE_RANGE_DAYS = 60;

const isPurchaseDateWithinAllowedWindow = (value: string): boolean => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  parsedDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const earliestAllowedDate = new Date(today);
  earliestAllowedDate.setDate(today.getDate() - (PURCHASE_DATE_RANGE_DAYS - 1));

  return parsedDate >= earliestAllowedDate && parsedDate <= today;
};

const fileSchema = z
  .instanceof(File, { message: 'Please upload a valid file.' })
  .refine(file => file.size <= MANUAL_REGISTRATION_MAX_FILE_SIZE_BYTES, 'Max file size is 5MB.')
  .refine(
    file =>
      MANUAL_REGISTRATION_ALLOWED_FILE_TYPES.includes(
        file.type as (typeof MANUAL_REGISTRATION_ALLOWED_FILE_TYPES)[number]
      ),
    'Only JPG and PNG files are allowed.'
  );

const paintPairSchema = z.object({
  topcoatProductId: z.string().trim().min(1, 'Topcoat product is required.'),
  topcoatQuantity: z
    .string()
    .trim()
    .min(1, 'Topcoat quantity is required.')
    .regex(quantityPattern, 'Enter a valid quantity (e.g., 5 or 5.5).'),
  basecoatProductId: z.string().trim(),
  basecoatQuantity: z.string().trim(),
});

const manualRegistrationBaseSchema = z.object({
  customerName: z.string().trim().min(2, 'Customer name is required.'),
  phoneNumber: z
    .string()
    .trim()
    .refine(value => pakistanPhoneInputPattern.test(value.replace(/[\s-]/g, '')), {
      message: 'Phone number must be in 923XXXXXXXXX format.',
    }),
  email: z.string().trim().min(1, 'Email is required.').pipe(z.email('Please enter a valid email address.')),
  city: z.string().trim().min(2, 'City is required.'),
  province: z.string().trim().min(2, 'Province is required.'),
  siteAddress: z.string().trim().min(5, 'Site address is required.'),
  postalCode: z
    .string()
    .trim()
    .refine(value => value.length === 0 || value.length >= 3, {
      message: 'Postal code must be at least 3 characters.',
    }),
  purchaseDate: z
    .string()
    .trim()
    .min(1, 'Purchase date is required.')
    .refine(isPurchaseDateWithinAllowedWindow, 'Purchase date must be within the last 60 days.'),
  purchaseDealer: z
    .string()
    .trim()
    .min(2, 'Dealer name is required.')
    .max(DEALER_NAME_MAX_LENGTH, `Dealer name must be ${DEALER_NAME_MAX_LENGTH} characters or less.`),
  purchaseDealerCity: z
    .string()
    .trim()
    .min(2, 'Dealer city is required.')
    .max(DEALER_CITY_MAX_LENGTH, `Dealer city must be ${DEALER_CITY_MAX_LENGTH} characters or less.`),
  purchaseDealerAddress: z
    .string()
    .trim()
    .min(5, 'Dealer address is required.')
    .max(DEALER_ADDRESS_MAX_LENGTH, `Dealer address must be ${DEALER_ADDRESS_MAX_LENGTH} characters or less.`),
  notes: z.string().trim().max(500, 'Notes must be 500 characters or less.'),
  topcoatProductId: z.string().trim().min(1, 'Topcoat product is required.'),
  topcoatQuantity: z
    .string()
    .trim()
    .min(1, 'Topcoat quantity is required.')
    .regex(quantityPattern, 'Enter a valid quantity (e.g., 5 or 5.5).'),
  basecoatProductId: z.string().trim(),
  basecoatQuantity: z.string().trim(),
  invoices: z.array(fileSchema).min(1, 'At least one invoice is required.'),
  additionalPaintPairs: z.array(paintPairSchema).default([]),
});

export const manualRegistrationSchema = manualRegistrationBaseSchema.superRefine((values, context) => {
  const allPairs = [
    {
      topcoatProductId: values.topcoatProductId,
      topcoatQuantity: values.topcoatQuantity,
      basecoatProductId: values.basecoatProductId,
      basecoatQuantity: values.basecoatQuantity,
      rootPath: [] as Array<string | number>,
    },
    ...values.additionalPaintPairs.map((pair, index) => ({
      ...pair,
      rootPath: ['additionalPaintPairs', index] as Array<string | number>,
    })),
  ];

  allPairs.forEach(pair => {
    if (pair.basecoatProductId && !pair.basecoatQuantity) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pair.rootPath, 'basecoatQuantity'],
        message: 'Basecoat quantity is required when basecoat is selected.',
      });
    }

    if (pair.basecoatQuantity && !pair.basecoatProductId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pair.rootPath, 'basecoatProductId'],
        message: 'Select a basecoat product before adding quantity.',
      });
    }

    if (pair.basecoatQuantity && !quantityPattern.test(pair.basecoatQuantity)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pair.rootPath, 'basecoatQuantity'],
        message: 'Enter a valid quantity (e.g., 5 or 5.5).',
      });
    }
  });
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
  additionalPaintPairs: true,
});

export const manualRegistrationStep4Schema = manualRegistrationBaseSchema.pick({
  invoices: true,
});

export type ManualRegistrationSchemaValues = z.infer<typeof manualRegistrationSchema>;
