import { z } from 'zod';

export const resubmissionFieldSchema = z.enum([
  'customer_name',
  'email',
  'city',
  'province',
  'site_address',
  'purchase_date',
  'purchase_dealer',
  'purchase_dealer_city',
  'purchase_dealer_address',
  'paint_pairs',
  'paint_pair_invoices',
]);

export const resubmissionSchema = z.object({
  fields: z.array(resubmissionFieldSchema).min(1, 'Select at least one field'),
  notes: z.string().min(1, 'Notes are required').max(500, 'Notes must be 500 characters or less'),
});

export type ResubmissionFormValues = z.infer<typeof resubmissionSchema>;
