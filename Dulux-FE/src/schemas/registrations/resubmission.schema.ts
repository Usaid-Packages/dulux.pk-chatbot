import { z } from 'zod';

import { NOTES_MAX_LENGTH } from '#/constants';

export const resubmissionFieldSchema = z.enum([
  'customer_name',
  'phone_number',
  'email',
  'city',
  'site_address',
  'purchase_date',
  'purchase_dealer',
  'purchase_dealer_city',
  'purchase_dealer_address',
  'postal_code',
  'paint_pairs',
  'paint_pair_invoices',
]);

export const resubmissionSchema = z.object({
  fields: z.array(resubmissionFieldSchema).min(1, 'Select at least one field'),
  notes: z.string().max(NOTES_MAX_LENGTH, `Notes must be ${NOTES_MAX_LENGTH} characters or less`),
});

export type ResubmissionFormValues = z.infer<typeof resubmissionSchema>;
