import type { JSX } from 'react';

import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui';
import { MANUAL_REGISTRATION_BASECOAT_PRODUCTS, MANUAL_REGISTRATION_TOPCOAT_PRODUCTS } from '#/constants';
import type { ManualRegistrationFormValues } from '#/types/manualRegistration';

/**
 * ProductsStep renders topcoat/basecoat product and quantity fields for step 3.
 *
 * @returns Product selection step section.
 */
export const ProductsStep = (): JSX.Element => {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ManualRegistrationFormValues>();

  const selectedBasecoat = useWatch({ control, name: 'basecoatProductName' });
  const hasBasecoat = Boolean(selectedBasecoat);

  return (
    <section className='space-y-4 rounded-lg border border-border bg-surface p-5'>
      <header>
        <h3 className='text-lg font-semibold text-text-primary'>Products</h3>
        <p className='text-sm text-text-muted'>Choose topcoat/basecoat products and add purchased quantities.</p>
      </header>

      <div className='grid gap-4 md:grid-cols-2'>
        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>Topcoat Product</span>
          <Controller
            control={control}
            name='topcoatProductName'
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label='Select topcoat product'>
                  <SelectValue placeholder='Select topcoat product' />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_REGISTRATION_TOPCOAT_PRODUCTS.map(product => (
                    <SelectItem key={product.id} value={product.label}>
                      {product.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.topcoatProductName ? (
            <p className='text-xs text-destructive'>{errors.topcoatProductName.message}</p>
          ) : null}
        </label>

        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>Topcoat Quantity (liters)</span>
          <Input placeholder='e.g. 8 or 8.5' {...register('topcoatQuantity')} />
          {errors.topcoatQuantity ? <p className='text-xs text-destructive'>{errors.topcoatQuantity.message}</p> : null}
        </label>

        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>Basecoat Product (optional)</span>
          <Controller
            control={control}
            name='basecoatProductName'
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label='Select basecoat product'>
                  <SelectValue placeholder='Select basecoat product' />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_REGISTRATION_BASECOAT_PRODUCTS.map(product => (
                    <SelectItem key={product.id} value={product.label}>
                      {product.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.basecoatProductName ? (
            <p className='text-xs text-destructive'>{errors.basecoatProductName.message}</p>
          ) : null}
        </label>

        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>Basecoat Quantity (liters)</span>
          <Input placeholder='e.g. 5 or 5.5' disabled={!hasBasecoat} {...register('basecoatQuantity')} />
          {errors.basecoatQuantity ? (
            <p className='text-xs text-destructive'>{errors.basecoatQuantity.message}</p>
          ) : null}
        </label>
      </div>
    </section>
  );
};
