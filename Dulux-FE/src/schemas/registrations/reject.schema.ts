import { z } from 'zod';

export const rejectSchema = z.object({
  notes: z.string().max(500, 'Notes must be 500 characters or less'),
});

export type RejectFormValues = z.infer<typeof rejectSchema>;
