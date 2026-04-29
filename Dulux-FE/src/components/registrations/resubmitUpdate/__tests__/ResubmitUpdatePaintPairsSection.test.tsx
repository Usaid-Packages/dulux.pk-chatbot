import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { ResubmitUpdatePaintPairsSection } from '#/components/registrations/resubmitUpdate';
import type { ResubmitUpdateFormValues } from '#/schemas/registrations';

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
});
