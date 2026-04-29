import { describe, expect, it } from 'vitest';

import { normalizeRegistrationDetailResponse } from '#/utils';

describe('normalizeRegistrationDetailResponse', () => {
  it('maps topcoat_product_type from API paint_pairs', () => {
    const specialist = normalizeRegistrationDetailResponse({
      id: 1,
      paint_pairs: [
        {
          id: 10,
          topcoat: 90,
          topcoat_name: 'Special LIME TWIST paint',
          topcoat_product_type: 'SPECIALIST',
          topcoat_quantity: '9.00',
          basecoat: null,
          basecoat_name: null,
          basecoat_quantity: null,
        },
      ],
    });

    const topcoat = normalizeRegistrationDetailResponse({
      id: 2,
      paint_pairs: [
        {
          id: 11,
          topcoat: 24,
          topcoat_name: 'Aquashield Waterproof Roofcoat',
          topcoat_product_type: 'TOPCOAT',
          topcoat_quantity: '6.00',
          basecoat: 7,
          basecoat_name: 'Dulux Exterior Crackbridging Primer',
          basecoat_quantity: '9.00',
        },
      ],
    });

    expect(specialist.paintPairs[0]?.topcoat.productType).toBe('SPECIALIST');
    expect(topcoat.paintPairs[0]?.topcoat.productType).toBe('TOPCOAT');
  });
});
