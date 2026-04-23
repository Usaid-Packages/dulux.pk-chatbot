import { z } from 'zod';

export const registrationCardCountsSchema = z.object({
  totalRegistrations: z.number().int().nonnegative(),
  submitted: z.number().int().nonnegative(),
  approved: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
});
