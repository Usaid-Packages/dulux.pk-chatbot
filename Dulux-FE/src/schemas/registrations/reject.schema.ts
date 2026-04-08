import { z } from 'zod';

export const rejectSchema = z.object({
  notes: z.string().min(1, 'Notes are required').max(500, 'Notes must be 500 characters or less'),
});

export type RejectFormValues = z.infer<typeof rejectSchema>;
