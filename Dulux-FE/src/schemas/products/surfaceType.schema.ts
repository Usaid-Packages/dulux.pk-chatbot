import { z } from 'zod';

import { productEnvironments } from '#/types/products';

export const surfaceTypeEnvironmentSchema = z.enum(productEnvironments);

export const surfaceTypeFormSchema = z.object({
  name: z.string().trim().min(1, 'Surface name is required.'),
  environment: surfaceTypeEnvironmentSchema,
  description: z.string().trim().max(300, 'Description must be 300 characters or fewer.').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type SurfaceTypeFormSchemaValues = z.infer<typeof surfaceTypeFormSchema>;
