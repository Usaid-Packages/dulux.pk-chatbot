import { z } from 'zod';

export const registrationCardCountsSchema = z.object({
  totalRegistrations: z.number().int().nonnegative(),
  pendingReview: z.number().int().nonnegative(),
  approved: z.number().int().nonnegative(),
});
