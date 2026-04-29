import { z } from 'zod';

import {
  MANUAL_REGISTRATION_ALLOWED_FILE_TYPES,
  MANUAL_REGISTRATION_MAX_FILE_SIZE_BYTES,
  NOTES_MAX_LENGTH,
} from '#/constants';

const quantityPattern = /^\d+(\.\d{1,2})?$/;
const pakistanPhoneInputPattern = /^923\d{9}$/;
const noDigitsPattern = /^[^\d]*$/;
const CITY_MAX_LENGTH = 80;
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
  selectionType: z.enum(['SPECIALIST', 'TOPCOAT', '']).default(''),
  specialistProductId: z.string().trim(),
  specialistQuantity: z.string().trim(),
  topcoatProductId: z.string().trim(),
  topcoatQuantity: z.string().trim(),
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
  city: z
    .string()
    .trim()
    .min(2, 'City is required.')
    .max(CITY_MAX_LENGTH, `City must be ${CITY_MAX_LENGTH} characters or less.`)
    .regex(noDigitsPattern, 'City must not contain numbers.'),
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
    .max(DEALER_NAME_MAX_LENGTH, `Dealer name must be ${DEALER_NAME_MAX_LENGTH} characters or less.`)
    .regex(noDigitsPattern, 'Dealer name must not contain numbers.'),
  purchaseDealerCity: z
    .string()
    .trim()
    .min(2, 'Dealer city is required.')
    .max(DEALER_CITY_MAX_LENGTH, `Dealer city must be ${DEALER_CITY_MAX_LENGTH} characters or less.`)
    .regex(noDigitsPattern, 'Dealer city must not contain numbers.'),
  purchaseDealerAddress: z
    .string()
    .trim()
    .min(5, 'Dealer address must be at least 5 characters.')
    .max(DEALER_ADDRESS_MAX_LENGTH, `Dealer address must be ${DEALER_ADDRESS_MAX_LENGTH} characters or less.`),
  notes: z.string().trim().max(NOTES_MAX_LENGTH, `Notes must be ${NOTES_MAX_LENGTH} characters or less.`),
  selectionType: z.enum(['SPECIALIST', 'TOPCOAT', '']).default(''),
  specialistProductId: z.string().trim(),
  specialistQuantity: z.string().trim(),
  topcoatProductId: z.string().trim(),
  topcoatQuantity: z.string().trim(),
  basecoatProductId: z.string().trim(),
  basecoatQuantity: z.string().trim(),
  invoices: z.array(fileSchema).min(1, 'At least one invoice is required.'),
  additionalPaintPairs: z.array(paintPairSchema).default([]),
});

export const manualRegistrationSchema = manualRegistrationBaseSchema.superRefine((values, context) => {
  const allPairs = [
    {
      selectionType: values.selectionType,
      specialistProductId: values.specialistProductId,
      specialistQuantity: values.specialistQuantity,
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
    const hasSpecialist = pair.specialistProductId.length > 0;
    const hasTopcoat = pair.topcoatProductId.length > 0;
    const hasSelectionType = pair.selectionType === 'SPECIALIST' || pair.selectionType === 'TOPCOAT';

    if (!hasSelectionType) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pair.rootPath, 'selectionType'],
        message: 'Select paint type before choosing products.',
      });
      return;
    }

    if (pair.selectionType === 'SPECIALIST' && !hasSpecialist) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pair.rootPath, 'specialistProductId'],
        message: 'Select a specialist product.',
      });
    }

    if (pair.selectionType === 'TOPCOAT' && !hasTopcoat) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pair.rootPath, 'topcoatProductId'],
        message: 'Select a topcoat product.',
      });
    }

    if (pair.selectionType === 'SPECIALIST' && hasTopcoat) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pair.rootPath, 'topcoatProductId'],
        message: 'Topcoat is not allowed when specialist type is selected.',
      });
    }

    if (pair.selectionType === 'TOPCOAT' && hasSpecialist) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pair.rootPath, 'specialistProductId'],
        message: 'Specialist is not allowed when topcoat type is selected.',
      });
    }

    if (pair.selectionType === 'SPECIALIST' && !pair.specialistQuantity) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pair.rootPath, 'specialistQuantity'],
        message: 'Specialist quantity is required when specialist product is selected.',
      });
    }

    if (
      pair.selectionType === 'SPECIALIST' &&
      pair.specialistQuantity &&
      !quantityPattern.test(pair.specialistQuantity)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pair.rootPath, 'specialistQuantity'],
        message: 'Enter a valid quantity (e.g., 5 or 5.5).',
      });
    }

    if (pair.selectionType === 'TOPCOAT' && !pair.topcoatQuantity) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pair.rootPath, 'topcoatQuantity'],
        message: 'Topcoat quantity is required when topcoat is selected.',
      });
    }

    if (pair.selectionType === 'TOPCOAT' && pair.topcoatQuantity && !quantityPattern.test(pair.topcoatQuantity)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pair.rootPath, 'topcoatQuantity'],
        message: 'Enter a valid quantity (e.g., 5 or 5.5).',
      });
    }

    if (pair.selectionType === 'SPECIALIST' && (pair.basecoatProductId || pair.basecoatQuantity)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pair.rootPath, 'basecoatProductId'],
        message: 'Basecoat is not allowed when specialist product is selected.',
      });
    }

    if (pair.selectionType === 'TOPCOAT' && pair.basecoatProductId && !pair.basecoatQuantity) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pair.rootPath, 'basecoatQuantity'],
        message: 'Basecoat quantity is required when basecoat is selected.',
      });
    }

    if (pair.selectionType === 'TOPCOAT' && pair.basecoatQuantity && !pair.basecoatProductId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pair.rootPath, 'basecoatProductId'],
        message: 'Select a basecoat product before adding quantity.',
      });
    }

    if (pair.selectionType === 'TOPCOAT' && pair.basecoatQuantity && !quantityPattern.test(pair.basecoatQuantity)) {
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
  siteAddress: true,
});

export const manualRegistrationStep2Schema = manualRegistrationBaseSchema.pick({
  purchaseDate: true,
  purchaseDealer: true,
  purchaseDealerCity: true,
  purchaseDealerAddress: true,
  notes: true,
});

export const manualRegistrationStep3Schema = manualRegistrationBaseSchema.pick({
  selectionType: true,
  specialistProductId: true,
  specialistQuantity: true,
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
