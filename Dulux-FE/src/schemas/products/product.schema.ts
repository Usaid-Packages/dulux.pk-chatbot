import { z } from 'zod';

import { productTypes } from '#/types/products';

export const productTypeSchema = z.enum(productTypes);

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Product name is required.'),
    productType: productTypeSchema,
    warrantyYears: z.coerce.number().int().min(1, 'Warranty years must be at least 1.'),
    coverageDetails: z.string().trim().min(1, 'Coverage details are required.'),
    webpageUrl: z.string().trim().url('Enter a valid URL.'),
    features: z.string().trim().min(1, 'Key features are required.'),
    isActive: z.boolean(),
    surfaceTypeIds: z.array(z.number().int().positive()).min(1, 'Select at least one surface type.'),
    basecoatIds: z.array(z.number().int().positive()).default([]),
  })
  .superRefine((values, context) => {
    if (values.productType !== 'TOPCOAT' && values.basecoatIds.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['basecoatIds'],
        message: 'Basecoats can only be assigned to TOPCOAT products.',
      });
    }
  });

export type ProductFormSchemaValues = z.infer<typeof productFormSchema>;
