import { describe, expect, it } from 'vitest';

import { manualRegistrationSchema } from '#/schemas/registrations/manualRegistration.schema';

const createBaseValues = () => ({
  customerName: 'Ali Khan',
  phoneNumber: '923001234567',
  email: 'ali@example.com',
  city: 'Karachi',
  siteAddress: 'Street 1',
  postalCode: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  purchaseDealer: 'Dealer Name',
  purchaseDealerCity: 'Karachi',
  purchaseDealerAddress: 'Dealer Street',
  notes: '',
  selectionType: '',
  specialistProductId: '',
  specialistQuantity: '',
  topcoatProductId: '',
  topcoatQuantity: '',
  basecoatProductId: '',
  basecoatQuantity: '',
  invoices: [new File(['invoice'], 'invoice.png', { type: 'image/png' })],
  additionalPaintPairs: [],
});

describe('manualRegistrationSchema specialist/topcoat exclusivity', () => {
  it('accepts specialist-only selection and blocks topcoat/basecoat requirements', () => {
    const parsed = manualRegistrationSchema.safeParse({
      ...createBaseValues(),
      selectionType: 'SPECIALIST',
      specialistProductId: '11',
      specialistQuantity: '9.5',
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects payload when both specialist and topcoat are selected', () => {
    const parsed = manualRegistrationSchema.safeParse({
      ...createBaseValues(),
      selectionType: 'SPECIALIST',
      specialistProductId: '11',
      specialistQuantity: '9.5',
      topcoatProductId: '4',
      topcoatQuantity: '8',
    });

    expect(parsed.success).toBe(false);
  });
});
