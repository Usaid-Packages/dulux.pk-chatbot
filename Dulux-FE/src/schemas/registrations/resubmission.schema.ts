import { z } from 'zod';

export const resubmissionFieldSchema = z.enum([
  'personal_info',
  'purchase_date',
  'dealer_info',
  'product_details',
  'topcoat_invoice',
  'basecoat_invoice',
]);

export const resubmissionSchema = z.object({
  fields: z.array(resubmissionFieldSchema).min(1, 'Select at least one field'),
  note: z.string().max(500, 'Note must be 500 characters or less').optional(),
});

export type ResubmissionFormValues = z.infer<typeof resubmissionSchema>;
