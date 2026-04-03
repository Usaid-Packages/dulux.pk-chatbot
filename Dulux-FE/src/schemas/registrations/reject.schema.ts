import { z } from 'zod';

export const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
  notes: z.string().min(1, 'Notes are required').max(500, 'Notes must be 500 characters or less'),
});

export type RejectFormValues = z.infer<typeof rejectSchema>;
