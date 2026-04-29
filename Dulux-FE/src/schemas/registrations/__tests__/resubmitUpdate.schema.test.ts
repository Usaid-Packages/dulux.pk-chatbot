import { describe, expect, it } from 'vitest';

import { resubmitUpdateSchema } from '#/schemas/registrations';

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
  postalCode: '',
  invoiceFiles: [],
  paintPairs: [
    {
      selectionType: 'SPECIALIST',
      topcoatId: '90',
      topcoatQuantity: '7.00',
      basecoatId: '',
      basecoatQuantity: '',
    },
  ],
} as const;

describe('resubmitUpdateSchema selection-type validation', () => {
  it('shows specialist-specific required message', () => {
    const result = resubmitUpdateSchema.safeParse({
      ...baseValues,
      paintPairs: [{ ...baseValues.paintPairs[0], topcoatId: '' }],
    });

    expect(result.success).toBe(false);
    const issues = result.error?.issues.map(issue => issue.message) ?? [];
    expect(issues).toContain('Specialist product is required.');
    expect(issues).not.toContain('Topcoat product is required.');
  });

  it('shows topcoat-specific required message for topcoat mode', () => {
    const result = resubmitUpdateSchema.safeParse({
      ...baseValues,
      paintPairs: [
        {
          selectionType: 'TOPCOAT',
          topcoatId: '',
          topcoatQuantity: '',
          basecoatId: '',
          basecoatQuantity: '',
        },
      ],
    });

    expect(result.success).toBe(false);
    const issues = result.error?.issues.map(issue => issue.message) ?? [];
    expect(issues).toContain('Topcoat product is required.');
    expect(issues).toContain('Topcoat quantity is required.');
  });
});
