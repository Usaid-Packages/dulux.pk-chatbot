import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { REGISTRATION_PRODUCT_TYPES } from '#/constants';
import type { ManualRegistrationFormValues } from '#/types/manualRegistration';
import { ProductsStep } from '../ProductsStep';

vi.mock('#/data-layer/registrations', () => ({
  useGetManualRegistrationProductOptionsInfiniteQuery: (productType: string) => {
    if (productType === REGISTRATION_PRODUCT_TYPES.SPECIALIST) {
      return {
        options: [{ id: '201', label: 'Specialist A', warrantyYears: 2, productType: 'SPECIALIST' }],
        hasNextPage: false,
        isLoading: false,
        isError: false,
        isFetchingNextPage: false,
        error: null,
        fetchNextPage: vi.fn(),
      };
    }

    if (productType === REGISTRATION_PRODUCT_TYPES.TOPCOAT) {
      return {
        options: [{ id: '101', label: 'Topcoat A', warrantyYears: 5, productType: 'TOPCOAT' }],
        hasNextPage: false,
        isLoading: false,
        isError: false,
        isFetchingNextPage: false,
        error: null,
        fetchNextPage: vi.fn(),
      };
    }

    return {
      options: [{ id: '301', label: 'Basecoat A', warrantyYears: 3, productType: 'BASECOAT' }],
      hasNextPage: false,
      isLoading: false,
      isError: false,
      isFetchingNextPage: false,
      error: null,
      fetchNextPage: vi.fn(),
    };
  },
}));

const renderWithForm = (defaultValues: ManualRegistrationFormValues): void => {
  const Wrapper = () => {
    const form = useForm<ManualRegistrationFormValues>({
      defaultValues,
    });

    return (
      <FormProvider {...form}>
        <ProductsStep />
      </FormProvider>
    );
  };

  render(<Wrapper />);
};

const baseValues: ManualRegistrationFormValues = {
  customerName: '',
  phoneNumber: '92',
  email: '',
  city: '',
  siteAddress: '',
  postalCode: '',
  purchaseDate: '',
  purchaseDealer: '',
  purchaseDealerCity: '',
  purchaseDealerAddress: '',
  notes: '',
  selectionType: '',
  specialistProductId: '',
  specialistQuantity: '',
  topcoatProductId: '',
  topcoatQuantity: '',
  basecoatProductId: '',
  basecoatQuantity: '',
  invoices: [],
  additionalPaintPairs: [],
};

describe('ProductsStep selection mode behavior', () => {
  it('shows only specialist fields when specialist mode is selected', () => {
    renderWithForm({
      ...baseValues,
      selectionType: 'SPECIALIST',
      specialistProductId: '201',
      specialistQuantity: '8',
    });

    expect(screen.getByLabelText('Select specialist product')).toBeInTheDocument();
    expect(screen.queryByLabelText('Select topcoat product')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Select basecoat product')).not.toBeInTheDocument();
  });

  it('shows topcoat and basecoat fields when topcoat mode is selected', () => {
    renderWithForm({
      ...baseValues,
      selectionType: 'TOPCOAT',
      topcoatProductId: '101',
      topcoatQuantity: '8',
    });

    expect(screen.getByLabelText('Select topcoat product')).toBeInTheDocument();
    expect(screen.getByLabelText('Select basecoat product')).toBeInTheDocument();
    expect(screen.queryByLabelText('Select specialist product')).not.toBeInTheDocument();
  });
});
