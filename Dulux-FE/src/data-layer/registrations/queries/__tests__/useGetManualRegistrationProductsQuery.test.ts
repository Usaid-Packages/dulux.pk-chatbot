import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { REGISTRATION_PRODUCT_TYPES } from '#/constants';
import * as services from '#/services';
import { useGetManualRegistrationProductsQuery } from '../useGetManualRegistrationProductsQuery';

vi.mock('#/services', () => ({
  performRequest: vi.fn(),
}));

const performRequestMock = vi.mocked(services.performRequest);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: Parameters<typeof QueryClientProvider>[0]['children'] }) => {
    return QueryClientProvider({ client: queryClient, children });
  };
};

describe('useGetManualRegistrationProductsQuery', () => {
  it('keeps linked basecoats with 0 warranty years in grouped topcoat options', async () => {
    performRequestMock.mockImplementation(async ({ params }) => {
      if (params?.product_type === REGISTRATION_PRODUCT_TYPES.TOPCOAT) {
        return {
          count: 1,
          next: null,
          previous: null,
          results: [{ id: 70, name: 'Topcoat A', product_type: 'TOPCOAT', warranty_years: 5, is_active: true }],
        };
      }

      if (params?.product_type === REGISTRATION_PRODUCT_TYPES.SPECIALIST) {
        return {
          count: 0,
          next: null,
          previous: null,
          results: [],
        };
      }

      return {
        count: 1,
        next: null,
        previous: null,
        results: [{ id: 10, name: 'Basecoat Zero', product_type: 'BASECOAT', warranty_years: 0, is_active: true }],
      };
    });

    const { result } = renderHook(() => useGetManualRegistrationProductsQuery(), {
      wrapper: createWrapper(),
    });

    await expect.poll(() => result.current.isSuccess).toBe(true);

    expect(result.current.data?.topcoatProducts).toEqual([
      {
        id: '70',
        label: 'Topcoat A',
        warrantyYears: 5,
        productType: 'TOPCOAT',
        isActive: true,
        linkedBasecoats: [
          {
            id: '10',
            label: 'Basecoat Zero',
            warrantyYears: 0,
            productType: 'BASECOAT',
            isActive: true,
          },
        ],
      },
    ]);
    expect(result.current.data?.basecoatProductsByTopcoatId['70']).toEqual([
      {
        id: '10',
        label: 'Basecoat Zero',
        warrantyYears: 0,
        productType: 'BASECOAT',
        isActive: true,
      },
    ]);
  });

  it('keeps only active linked basecoats in grouped topcoat options', async () => {
    performRequestMock.mockImplementation(async ({ params }) => {
      if (params?.product_type === REGISTRATION_PRODUCT_TYPES.TOPCOAT) {
        return {
          count: 1,
          next: null,
          previous: null,
          results: [{ id: 70, name: 'Topcoat A', product_type: 'TOPCOAT', warranty_years: 5, is_active: true }],
        };
      }

      if (params?.product_type === REGISTRATION_PRODUCT_TYPES.SPECIALIST) {
        return {
          count: 0,
          next: null,
          previous: null,
          results: [],
        };
      }

      return {
        count: 2,
        next: null,
        previous: null,
        results: [
          { id: 10, name: 'Basecoat Active', product_type: 'BASECOAT', warranty_years: 0, is_active: true },
          { id: 11, name: 'Basecoat Inactive', product_type: 'BASECOAT', warranty_years: 2, is_active: false },
        ],
      };
    });

    const { result } = renderHook(() => useGetManualRegistrationProductsQuery(), {
      wrapper: createWrapper(),
    });

    await expect.poll(() => result.current.isSuccess).toBe(true);

    expect(result.current.data?.topcoatProducts[0]?.linkedBasecoats).toEqual([
      {
        id: '10',
        label: 'Basecoat Active',
        warrantyYears: 0,
        productType: 'BASECOAT',
        isActive: true,
      },
    ]);
    expect(result.current.data?.basecoatProductsByTopcoatId['70']).toEqual([
      {
        id: '10',
        label: 'Basecoat Active',
        warrantyYears: 0,
        productType: 'BASECOAT',
        isActive: true,
      },
    ]);
  });
});
