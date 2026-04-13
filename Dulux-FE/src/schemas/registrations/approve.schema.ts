import { z } from 'zod';

import { NOTES_MAX_LENGTH } from '#/constants';

export const approveSchema = z.object({
  notes: z.string().max(NOTES_MAX_LENGTH, `Notes must be ${NOTES_MAX_LENGTH} characters or less`),
});

export type ApproveFormValues = z.infer<typeof approveSchema>;
