import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { ResubmitUpdatePaintPairsSection } from '#/components/registrations/resubmitUpdate';
import { REGISTRATION_PRODUCT_TYPES } from '#/constants/registrations';
import type { ResubmitUpdateFormValues } from '#/schemas/registrations';

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => undefined;
}

if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => undefined;
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

const fetchNextPageTopcoatMock = vi.fn();
const fetchNextPageSpecialistMock = vi.fn();
const fetchNextPageBasecoatMock = vi.fn();

vi.mock('#/data-layer/registrations', () => ({
  useGetManualRegistrationProductOptionsInfiniteQuery: (productType: string, topcoatId?: string) => {
    if (productType === REGISTRATION_PRODUCT_TYPES.TOPCOAT) {
      return {
        options: [{ id: '24', label: 'Aquashield Waterproof Roofcoat', warrantyYears: 8, productType: 'TOPCOAT' }],
        hasNextPage: true,
        isLoading: false,
        isError: false,
        isFetchingNextPage: false,
        error: null,
        fetchNextPage: fetchNextPageTopcoatMock,
      };
    }

    if (productType === REGISTRATION_PRODUCT_TYPES.SPECIALIST) {
      return {
        options: [{ id: '90', label: 'Special LIME TWIST paint', warrantyYears: 10, productType: 'SPECIALIST' }],
        hasNextPage: true,
        isLoading: false,
        isError: false,
        isFetchingNextPage: false,
        error: null,
        fetchNextPage: fetchNextPageSpecialistMock,
      };
    }

    if (productType === REGISTRATION_PRODUCT_TYPES.BASECOAT && topcoatId) {
      return {
        options: [
          { id: '7', label: 'Dulux Exterior Crackbridging Primer', warrantyYears: 0, productType: 'BASECOAT' },
          { id: '8', label: 'Inactive Basecoat', warrantyYears: 2, productType: 'BASECOAT', isActive: false },
        ],
        hasNextPage: true,
        isLoading: false,
        isError: false,
        isFetchingNextPage: false,
        error: null,
        fetchNextPage: fetchNextPageBasecoatMock,
      };
    }

    return {
      options: [],
      hasNextPage: false,
      isLoading: false,
      isError: false,
      isFetchingNextPage: false,
      error: null,
      fetchNextPage: vi.fn(),
    };
  },
}));

const defaultValues: ResubmitUpdateFormValues = {
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
      selectionType: '',
      topcoatId: '',
      topcoatQuantity: '',
      basecoatId: '',
      basecoatQuantity: '',
    },
  ],
};

describe('ResubmitUpdatePaintPairsSection', () => {
  it('shows warranty text in dropdown options for topcoat and basecoat', async () => {
    const user = userEvent.setup();

    const Wrapper = () => {
      const form = useForm<ResubmitUpdateFormValues>({
        defaultValues: {
          ...defaultValues,
          paintPairs: [
            {
              selectionType: 'TOPCOAT',
              topcoatId: '24',
              topcoatQuantity: '',
              basecoatId: '',
              basecoatQuantity: '',
            },
          ],
        },
      });
      return (
        <FormProvider {...form}>
          <ResubmitUpdatePaintPairsSection
            requestedFieldNames={['paint_pairs']}
            existingPaintPairs={[]}
            control={form.control}
            register={form.register}
            setValue={form.setValue}
            clearErrors={form.clearErrors}
            errors={form.formState.errors}
            paintPairRows={[
              {
                rowId: 'row-1',
                rowIndex: 0,
                selectionType: 'TOPCOAT',
                selectedTopcoatId: '24',
                selectedBasecoatId: '',
                isSpecialistTopcoatSelected: false,
                basecoatOptions: [],
              },
            ]}
            topcoatOptions={[{ id: '24', label: 'Aquashield Waterproof Roofcoat', productType: 'TOPCOAT' }]}
            isPaintProductsLoading={false}
            isPaintProductsError={false}
            paintProductsErrorMessage=''
            onAddPaintPair={() => undefined}
            onRemovePaintPair={() => undefined}
          />
        </FormProvider>
      );
    };

    render(<Wrapper />);

    await user.click(screen.getByLabelText('Select topcoat product'));
    expect(screen.getAllByText('Aquashield Waterproof Roofcoat (8 year warranty)').length).toBeGreaterThan(0);

    await user.keyboard('{Escape}');
    await user.click(screen.getByLabelText('Select basecoat product'));
    expect(screen.getAllByText('Dulux Exterior Crackbridging Primer (0 year warranty)').length).toBeGreaterThan(0);
  });

  it('does not show inactive linked basecoats in resubmit flow', async () => {
    const user = userEvent.setup();

    const Wrapper = () => {
      const form = useForm<ResubmitUpdateFormValues>({
        defaultValues: {
          ...defaultValues,
          paintPairs: [
            {
              selectionType: 'TOPCOAT',
              topcoatId: '24',
              topcoatQuantity: '',
              basecoatId: '',
              basecoatQuantity: '',
            },
          ],
        },
      });
      return (
        <FormProvider {...form}>
          <ResubmitUpdatePaintPairsSection
            requestedFieldNames={['paint_pairs']}
            existingPaintPairs={[]}
            control={form.control}
            register={form.register}
            setValue={form.setValue}
            clearErrors={form.clearErrors}
            errors={form.formState.errors}
            paintPairRows={[
              {
                rowId: 'row-1',
                rowIndex: 0,
                selectionType: 'TOPCOAT',
                selectedTopcoatId: '24',
                selectedBasecoatId: '',
                isSpecialistTopcoatSelected: false,
                basecoatOptions: [],
              },
            ]}
            topcoatOptions={[{ id: '24', label: 'Aquashield Waterproof Roofcoat', productType: 'TOPCOAT' }]}
            isPaintProductsLoading={false}
            isPaintProductsError={false}
            paintProductsErrorMessage=''
            onAddPaintPair={() => undefined}
            onRemovePaintPair={() => undefined}
          />
        </FormProvider>
      );
    };

    render(<Wrapper />);

    await user.click(screen.getByLabelText('Select basecoat product'));
    expect(screen.queryByText('Inactive Basecoat (2 year warranty)')).not.toBeInTheDocument();
  });

  it('fetches next linked basecoat page on scroll', async () => {
    const user = userEvent.setup();
    fetchNextPageBasecoatMock.mockClear();

    const Wrapper = () => {
      const form = useForm<ResubmitUpdateFormValues>({
        defaultValues: {
          ...defaultValues,
          paintPairs: [
            {
              selectionType: 'TOPCOAT',
              topcoatId: '24',
              topcoatQuantity: '',
              basecoatId: '',
              basecoatQuantity: '',
            },
          ],
        },
      });
      return (
        <FormProvider {...form}>
          <ResubmitUpdatePaintPairsSection
            requestedFieldNames={['paint_pairs']}
            existingPaintPairs={[]}
            control={form.control}
            register={form.register}
            setValue={form.setValue}
            clearErrors={form.clearErrors}
            errors={form.formState.errors}
            paintPairRows={[
              {
                rowId: 'row-1',
                rowIndex: 0,
                selectionType: 'TOPCOAT',
                selectedTopcoatId: '24',
                selectedBasecoatId: '',
                isSpecialistTopcoatSelected: false,
                basecoatOptions: [],
              },
            ]}
            topcoatOptions={[{ id: '24', label: 'Aquashield Waterproof Roofcoat', productType: 'TOPCOAT' }]}
            isPaintProductsLoading={false}
            isPaintProductsError={false}
            paintProductsErrorMessage=''
            onAddPaintPair={() => undefined}
            onRemovePaintPair={() => undefined}
          />
        </FormProvider>
      );
    };

    render(<Wrapper />);
    await user.click(screen.getByLabelText('Select basecoat product'));
    const option = await screen.findByText('Dulux Exterior Crackbridging Primer (0 year warranty)');
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

  it('shows specialist inputs when Specialized Coat is selected', async () => {
    const user = userEvent.setup();

    const Wrapper = () => {
      const form = useForm<ResubmitUpdateFormValues>({ defaultValues });
      return (
        <FormProvider {...form}>
          <ResubmitUpdatePaintPairsSection
            requestedFieldNames={['paint_pairs']}
            existingPaintPairs={[]}
            control={form.control}
            register={form.register}
            setValue={form.setValue}
            clearErrors={form.clearErrors}
            errors={form.formState.errors}
            paintPairRows={[
              {
                rowId: 'row-1',
                rowIndex: 0,
                selectionType: '',
                selectedTopcoatId: '',
                selectedBasecoatId: '',
                isSpecialistTopcoatSelected: false,
                basecoatOptions: [],
              },
            ]}
            topcoatOptions={[
              { id: '90', label: 'Special LIME TWIST paint', productType: 'SPECIALIST' },
              { id: '24', label: 'Aquashield Waterproof Roofcoat', productType: 'TOPCOAT' },
            ]}
            isPaintProductsLoading={false}
            isPaintProductsError={false}
            paintProductsErrorMessage=''
            onAddPaintPair={() => undefined}
            onRemovePaintPair={() => undefined}
          />
        </FormProvider>
      );
    };

    render(<Wrapper />);
    await user.click(screen.getByRole('button', { name: 'Specialized Coat' }));

    expect(screen.getByText('Specialist Product')).toBeInTheDocument();
    expect(screen.getByText('Specialist Quantity (liters)')).toBeInTheDocument();
  });

  it('disables basecoat until topcoat is selected for Topcoat + Basecoat flow', () => {
    const Wrapper = () => {
      const form = useForm<ResubmitUpdateFormValues>({
        defaultValues: {
          ...defaultValues,
          paintPairs: [
            {
              selectionType: 'TOPCOAT',
              topcoatId: '',
              topcoatQuantity: '',
              basecoatId: '',
              basecoatQuantity: '',
            },
          ],
        },
      });
      return (
        <FormProvider {...form}>
          <ResubmitUpdatePaintPairsSection
            requestedFieldNames={['paint_pairs']}
            existingPaintPairs={[]}
            control={form.control}
            register={form.register}
            setValue={form.setValue}
            clearErrors={form.clearErrors}
            errors={form.formState.errors}
            paintPairRows={[
              {
                rowId: 'row-1',
                rowIndex: 0,
                selectionType: 'TOPCOAT',
                selectedTopcoatId: '',
                selectedBasecoatId: '',
                isSpecialistTopcoatSelected: false,
                basecoatOptions: [{ id: '7', label: 'Dulux Exterior Crackbridging Primer' }],
              },
            ]}
            topcoatOptions={[
              { id: '90', label: 'Special LIME TWIST paint', productType: 'SPECIALIST' },
              { id: '24', label: 'Aquashield Waterproof Roofcoat', productType: 'TOPCOAT' },
            ]}
            isPaintProductsLoading={false}
            isPaintProductsError={false}
            paintProductsErrorMessage=''
            onAddPaintPair={() => undefined}
            onRemovePaintPair={() => undefined}
          />
        </FormProvider>
      );
    };

    render(<Wrapper />);

    expect(screen.getByLabelText('Select basecoat product')).toBeDisabled();
  });

  it('does not fetch next topcoat page unless user scrolls down', async () => {
    const user = userEvent.setup();
    fetchNextPageTopcoatMock.mockClear();

    const Wrapper = () => {
      const form = useForm<ResubmitUpdateFormValues>({
        defaultValues: {
          ...defaultValues,
          paintPairs: [
            {
              selectionType: 'TOPCOAT',
              topcoatId: '',
              topcoatQuantity: '',
              basecoatId: '',
              basecoatQuantity: '',
            },
          ],
        },
      });
      return (
        <FormProvider {...form}>
          <ResubmitUpdatePaintPairsSection
            requestedFieldNames={['paint_pairs']}
            existingPaintPairs={[]}
            control={form.control}
            register={form.register}
            setValue={form.setValue}
            clearErrors={form.clearErrors}
            errors={form.formState.errors}
            paintPairRows={[
              {
                rowId: 'row-1',
                rowIndex: 0,
                selectionType: 'TOPCOAT',
                selectedTopcoatId: '',
                selectedBasecoatId: '',
                isSpecialistTopcoatSelected: false,
                basecoatOptions: [],
              },
            ]}
            topcoatOptions={[{ id: '24', label: 'Aquashield Waterproof Roofcoat', productType: 'TOPCOAT' }]}
            isPaintProductsLoading={false}
            isPaintProductsError={false}
            paintProductsErrorMessage=''
            onAddPaintPair={() => undefined}
            onRemovePaintPair={() => undefined}
          />
        </FormProvider>
      );
    };

    render(<Wrapper />);
    await user.click(screen.getByLabelText('Select topcoat product'));
    const option = await screen.findByText('Aquashield Waterproof Roofcoat (8 year warranty)');
    const scrollViewport = option.closest('[data-radix-select-viewport]');
    if (!scrollViewport) {
      throw new Error('Scroll viewport not found');
    }

    Object.defineProperty(scrollViewport, 'scrollHeight', { configurable: true, value: 500 });
    Object.defineProperty(scrollViewport, 'clientHeight', { configurable: true, value: 200 });
    Object.defineProperty(scrollViewport, 'scrollTop', { configurable: true, value: 0, writable: true });

    fireEvent.scroll(scrollViewport);
    expect(fetchNextPageTopcoatMock).not.toHaveBeenCalled();

    Object.defineProperty(scrollViewport, 'scrollTop', { configurable: true, value: 300, writable: true });
    fireEvent.scroll(scrollViewport);

    await waitFor(() => {
      expect(fetchNextPageTopcoatMock).toHaveBeenCalledTimes(1);
    });
  });
});
