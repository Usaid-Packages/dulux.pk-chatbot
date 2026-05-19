import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { REGISTRATION_PRODUCT_TYPES } from '#/constants';
import type { ManualRegistrationFormValues } from '#/types/manualRegistration';
import { ProductsStep } from '../ProductsStep';

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => undefined;
}

if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => undefined;
}

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => undefined;
}

const fetchNextPageBasecoatMock = vi.fn();

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
        hasNextPage: true,
        isLoading: false,
        isError: false,
        isFetchingNextPage: false,
        error: null,
        fetchNextPage: vi.fn(),
      };
    }

    return {
      options: [
        { id: '301', label: 'Basecoat Zero', warrantyYears: 0, productType: 'BASECOAT' },
        { id: '302', label: 'Basecoat Inactive', warrantyYears: 2, productType: 'BASECOAT', isActive: false },
      ],
      hasNextPage: true,
      isLoading: false,
      isError: false,
      isFetchingNextPage: false,
      error: null,
      fetchNextPage: fetchNextPageBasecoatMock,
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

  it('shows 0 year warranty text for linked basecoat options', async () => {
    const user = userEvent.setup();

    renderWithForm({
      ...baseValues,
      selectionType: 'TOPCOAT',
      topcoatProductId: '101',
      topcoatQuantity: '8',
    });

    await user.click(screen.getByLabelText('Select basecoat product'));

    expect(screen.getAllByText('Basecoat Zero (0 year warranty)').length).toBeGreaterThan(0);
  });

  it('does not show inactive linked basecoats in the dropdown', async () => {
    const user = userEvent.setup();

    renderWithForm({
      ...baseValues,
      selectionType: 'TOPCOAT',
      topcoatProductId: '101',
      topcoatQuantity: '8',
    });

    await user.click(screen.getByLabelText('Select basecoat product'));

    expect(screen.queryByText('Basecoat Inactive (2 year warranty)')).not.toBeInTheDocument();
  });

  it('fetches next linked basecoat page when user scrolls to the bottom', async () => {
    const user = userEvent.setup();
    fetchNextPageBasecoatMock.mockClear();

    renderWithForm({
      ...baseValues,
      selectionType: 'TOPCOAT',
      topcoatProductId: '101',
      topcoatQuantity: '8',
    });

    await user.click(screen.getByLabelText('Select basecoat product'));
    const option = await screen.findByText('Basecoat Zero (0 year warranty)');
    const scrollViewport = option.closest('[data-radix-select-viewport]');
    if (!scrollViewport) {
      throw new Error('Scroll viewport not found');
    }

    Object.defineProperty(scrollViewport, 'scrollHeight', { configurable: true, value: 500 });
    Object.defineProperty(scrollViewport, 'clientHeight', { configurable: true, value: 200 });
    Object.defineProperty(scrollViewport, 'scrollTop', { configurable: true, value: 300, writable: true });

    fireEvent.scroll(scrollViewport);

    await waitFor(() => {
      expect(fetchNextPageBasecoatMock).toHaveBeenCalledTimes(1);
    });
  });
});
