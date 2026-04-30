import { describe, expect, it } from 'vitest';

import { registrationEditSchema } from '#/schemas/registrations';

const createInvoiceFile = (): File => {
  return new File(['invoice-image'], 'invoice.jpg', { type: 'image/jpeg' });
};

const baseValues = {
  customerName: 'Ali',
  phoneNumber: '923001234567',
  email: 'ali@example.com',
  city: 'Karachi',
  siteAddress: 'Street 1',
  purchaseDate: '2026-04-20',
  purchaseDealer: 'Dealer',
  purchaseDealerCity: 'Karachi',
  purchaseDealerAddress: 'Dealer Address',
  existingInvoiceImageIds: [1],
  invoiceFiles: [],
} as const;

describe('registrationEditSchema paint-pair validation', () => {
  it('allows save when update paint-pair row is fully empty', () => {
    const result = registrationEditSchema.safeParse({
      ...baseValues,
      paintPairs: [
        {
          selectionType: '',
          topcoatId: '',
          topcoatQuantity: '',
          basecoatId: '',
          basecoatQuantity: '',
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('requires paint type when paint-pair row has product data', () => {
    const result = registrationEditSchema.safeParse({
      ...baseValues,
      paintPairs: [
        {
          selectionType: '',
          topcoatId: '24',
          topcoatQuantity: '',
          basecoatId: '',
          basecoatQuantity: '',
        },
      ],
    });

    expect(result.success).toBe(false);
    const issues = result.error?.issues.map(issue => issue.message) ?? [];
    expect(issues).toContain('Select paint type first.');
  });

  it('still requires at least one invoice image overall', () => {
    const result = registrationEditSchema.safeParse({
      ...baseValues,
      existingInvoiceImageIds: [],
      invoiceFiles: [createInvoiceFile()],
      paintPairs: [
        {
          selectionType: '',
          topcoatId: '',
          topcoatQuantity: '',
          basecoatId: '',
          basecoatQuantity: '',
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
