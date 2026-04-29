import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ManualRegistrationFormValues } from '#/types/manualRegistration';
import { useCreateManualRegistrationMutation } from '../useCreateManualRegistrationMutation';

const mockPerformRequest = vi.fn();

vi.mock('#/services', () => ({
  performRequest: (...args: unknown[]) => mockPerformRequest(...args),
}));

const createWrapper = (): ((props: { children: ReactNode }) => ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const baseValues: ManualRegistrationFormValues = {
  customerName: 'Ali Khan',
  phoneNumber: '923001234567',
  email: 'ali@example.com',
  city: 'Karachi',
  siteAddress: 'Street 1',
  postalCode: '',
  purchaseDate: '2026-04-28',
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
  invoices: [new File(['invoice'], 'invoice.jpg', { type: 'image/jpeg' })],
  additionalPaintPairs: [],
};

describe('useCreateManualRegistrationMutation integration', () => {
  beforeEach(() => {
    mockPerformRequest.mockReset();
  });

  it('maps specialist selection into paintPairs.topcoat and omits basecoat fields', async () => {
    mockPerformRequest
      .mockResolvedValueOnce({ id: 901 }) // upload image
      .mockResolvedValueOnce({ id: 77, registrationCode: 'REG-77' }); // create registration

    const { result } = renderHook(() => useCreateManualRegistrationMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        ...baseValues,
        selectionType: 'SPECIALIST',
        specialistProductId: '201',
        specialistQuantity: '9.50',
      });
    });

    const createCall = mockPerformRequest.mock.calls[1]?.[0] as {
      payload?: { paintPairs?: Array<Record<string, unknown>> };
    };
    expect(createCall.payload?.paintPairs).toEqual([
      {
        topcoat: 201,
        topcoatQuantity: '9.50',
      },
    ]);
  });
});
