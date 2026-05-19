import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { REGISTRATION_PRODUCT_TYPES } from '#/constants';
import { useGetManualRegistrationProductOptionsInfiniteQuery } from '../useGetManualRegistrationProductOptionsInfiniteQuery';

const useInfiniteQueryMock = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: (...args: unknown[]) => useInfiniteQueryMock(...args),
}));

describe('useGetManualRegistrationProductOptionsInfiniteQuery', () => {
  it('keeps basecoat options with 0 warranty years', () => {
    useInfiniteQueryMock.mockReturnValue({
      data: {
        pages: [
          {
            results: [
              {
                id: 10,
                name: 'Dulux Aquashield Interior Waterproof Basecoat',
                product_type: 'BASECOAT',
                warranty_years: 0,
                is_active: true,
              },
            ],
          },
        ],
      },
      hasNextPage: false,
      isLoading: false,
      isError: false,
      isFetchingNextPage: false,
      error: null,
      fetchNextPage: vi.fn(),
    });

    const { result } = renderHook(() =>
      useGetManualRegistrationProductOptionsInfiniteQuery(REGISTRATION_PRODUCT_TYPES.BASECOAT, '70')
    );

    expect(result.current.options).toEqual([
      {
        id: '10',
        label: 'Dulux Aquashield Interior Waterproof Basecoat',
        warrantyYears: 0,
        productType: 'BASECOAT',
        isActive: true,
      },
    ]);
  });

  it('filters out inactive linked basecoats', () => {
    useInfiniteQueryMock.mockReturnValue({
      data: {
        pages: [
          {
            results: [
              {
                id: 10,
                name: 'Active Basecoat',
                product_type: 'BASECOAT',
                warranty_years: 0,
                is_active: true,
              },
              {
                id: 11,
                name: 'Inactive Basecoat',
                product_type: 'BASECOAT',
                warranty_years: 3,
                is_active: false,
              },
            ],
          },
        ],
      },
      hasNextPage: false,
      isLoading: false,
      isError: false,
      isFetchingNextPage: false,
      error: null,
      fetchNextPage: vi.fn(),
    });

    const { result } = renderHook(() =>
      useGetManualRegistrationProductOptionsInfiniteQuery(REGISTRATION_PRODUCT_TYPES.BASECOAT, '70')
    );

    expect(result.current.options).toEqual([
      {
        id: '10',
        label: 'Active Basecoat',
        warrantyYears: 0,
        productType: 'BASECOAT',
        isActive: true,
      },
    ]);
  });
});
