import { z } from 'zod';

export const approveSchema = z.object({
  notes: z.string().max(500, 'Notes must be 500 characters or less'),
});

export type ApproveFormValues = z.infer<typeof approveSchema>;
