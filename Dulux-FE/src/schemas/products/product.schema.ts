import { z } from 'zod';

import { PRODUCT_FORM_MAX_LENGTHS } from '#/constants';
import { PRODUCT_TYPES, productTypes } from '#/types/products';

export const productTypeSchema = z.enum(productTypes);

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Product name is required.'),
    productType: productTypeSchema,
    warrantyYears: z
      .preprocess(value => {
        if (value === '' || value === null || value === undefined) {
          return undefined;
        }

        if (typeof value === 'number' && Number.isNaN(value)) {
          return undefined;
        }

        if (typeof value === 'string') {
          const parsedValue = Number(value);
          return Number.isNaN(parsedValue) ? value : parsedValue;
        }

        return value;
      }, z.number().int('Warranty years must be a whole number.').min(0, 'Warranty years must be 0 or greater.').optional())
      .refine(value => value !== undefined, {
        message: 'Warranty years are required.',
      }),
    coverageDetails: z
      .string()
      .trim()
      .min(1, 'Coverage details are required.')
      .max(
        PRODUCT_FORM_MAX_LENGTHS.coverageDetails,
        `Coverage details must be ${PRODUCT_FORM_MAX_LENGTHS.coverageDetails} characters or less.`
      ),
    webpageUrl: z.string().trim().url('Enter a valid URL.'),
    features: z
      .string()
      .trim()
      .min(1, 'Key features are required.')
      .max(
        PRODUCT_FORM_MAX_LENGTHS.features,
        `Key features must be ${PRODUCT_FORM_MAX_LENGTHS.features} characters or less.`
      ),
    isActive: z.boolean(),
    surfaceTypeIds: z.array(z.number().int().positive()).min(1, 'Select at least one surface type.'),
    basecoatIds: z.array(z.number().int().positive()).default([]),
  })
  .superRefine((values, context) => {
    if (values.productType !== PRODUCT_TYPES.TOPCOAT && values.basecoatIds.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['basecoatIds'],
        message: 'Basecoats can only be assigned to TOPCOAT products.',
      });
    }
  });

export type ProductFormSchemaValues = z.infer<typeof productFormSchema>;
