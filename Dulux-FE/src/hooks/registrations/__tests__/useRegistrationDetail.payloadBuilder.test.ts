import { describe, expect, it } from 'vitest';

import type { ResubmitUpdateFormValues } from '#/schemas/registrations';
import type { RegistrationDetail } from '#/types/registrations';
import { buildResubmitUpdatePayload } from '../useRegistrationDetail.payloadBuilder';

const createRegistrationDetail = (): RegistrationDetail => ({
  id: 12,
  registrationCode: 'REG-12',
  channel: 'WEBFORM',
  state: 'RESUBMIT',
  customerName: 'Ali',
  phoneNumber: '923001112223',
  email: 'ali@example.com',
  city: 'Karachi',
  siteAddress: 'Site A',
  purchaseDate: '2026-04-01',
  purchaseDealer: 'Dealer',
  purchaseDealerCity: 'Karachi',
  purchaseDealerAddress: 'Address',
  postalCode: '',
  notes: '',
  approvedBy: null,
  approvedByEmail: null,
  approvedAt: null,
  warrantyCertificate: null,
  paintPairs: [],
  paintPairInvoices: [],
  rejectionFields: [
    {
      id: 1,
      fieldName: 'paint_pairs',
      note: 'Update paint pairs',
      created: '2026-04-01T00:00:00Z',
    },
  ],
  created: '2026-04-01T00:00:00Z',
  modified: '2026-04-01T00:00:00Z',
});

const createValues = (overrides?: Partial<ResubmitUpdateFormValues>): ResubmitUpdateFormValues => ({
  customerName: 'Ali',
  phoneNumber: '923001112223',
  email: 'ali@example.com',
  city: 'Karachi',
  siteAddress: 'Site A',
  purchaseDate: '2026-04-01',
  purchaseDealer: 'Dealer',
  purchaseDealerCity: 'Karachi',
  purchaseDealerAddress: 'Address',
  postalCode: '',
  invoiceFiles: [],
  paintPairs: [
    {
      selectionType: 'TOPCOAT',
      topcoatId: '123',
      topcoatQuantity: '10.00',
      basecoatId: '',
      basecoatQuantity: '4.00',
    },
  ],
  ...overrides,
});

describe('buildResubmitUpdatePayload', () => {
  it('omits basecoat fields when no basecoat product id is selected', () => {
    const payload = buildResubmitUpdatePayload(createRegistrationDetail(), createValues());
    expect(payload.paintPairs).toEqual([
      {
        topcoat: 123,
        topcoatQuantity: '10.00',
      },
    ]);
  });

  it('includes basecoat fields when basecoat id is selected', () => {
    const payload = buildResubmitUpdatePayload(
      createRegistrationDetail(),
      createValues({
        paintPairs: [
          {
            selectionType: 'TOPCOAT',
            topcoatId: '123',
            topcoatQuantity: '10.00',
            basecoatId: '88',
            basecoatQuantity: '4.00',
          },
        ],
      })
    );

    expect(payload.paintPairs).toEqual([
      {
        topcoat: 123,
        topcoatQuantity: '10.00',
        basecoat: 88,
        basecoatQuantity: '4.00',
      },
    ]);
  });

  it('omits basecoat fields for specialist selection in payload', () => {
    const payload = buildResubmitUpdatePayload(
      createRegistrationDetail(),
      createValues({
        paintPairs: [
          {
            selectionType: 'SPECIALIST',
            topcoatId: '90',
            topcoatQuantity: '7.00',
            basecoatId: '88',
            basecoatQuantity: '2.00',
          },
        ],
      })
    );

    expect(payload.paintPairs).toEqual([
      {
        topcoat: 90,
        topcoatQuantity: '7.00',
      },
    ]);
  });
});
