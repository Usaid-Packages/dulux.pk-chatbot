/* eslint import/order: off */
import type { JSX } from 'react';

import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { useGetManualRegistrationProductsQuery } from '#/data-layer/registrations';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui';
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
  const manualProductsQuery = useGetManualRegistrationProductsQuery();

  const selectedBasecoat = useWatch({ control, name: 'basecoatProductId' });
  const hasBasecoat = Boolean(selectedBasecoat);
  const topcoatProducts = manualProductsQuery.data?.topcoatProducts ?? [];
  const basecoatProducts = manualProductsQuery.data?.basecoatProducts ?? [];
  const productLoadError = manualProductsQuery.error?.message ?? 'Unable to load product options.';

  return (
    <section className='space-y-4 wf-card wf-card-p5'>
      <header>
        <h3 className='text-lg font-semibold text-text-primary'>Products</h3>
        <p className='text-sm text-text-muted'>Choose topcoat/basecoat products and add purchased quantities.</p>
      </header>

      <div className='grid gap-4 md:grid-cols-2'>
        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>Topcoat Product</span>
          <Controller
            control={control}
            name='topcoatProductId'
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={manualProductsQuery.isLoading}>
                <SelectTrigger aria-label='Select topcoat product'>
                  <SelectValue placeholder='Select topcoat product' />
                </SelectTrigger>
                <SelectContent>
                  {topcoatProducts.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {manualProductsQuery.isLoading ? <p className='text-xs text-text-muted'>Loading products...</p> : null}
          {manualProductsQuery.isError ? <p className='text-xs text-destructive'>{productLoadError}</p> : null}
          {errors.topcoatProductId ? (
            <p className='text-xs text-destructive'>{errors.topcoatProductId.message}</p>
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
            name='basecoatProductId'
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={manualProductsQuery.isLoading}>
                <SelectTrigger aria-label='Select basecoat product'>
                  <SelectValue placeholder='Select basecoat product' />
                </SelectTrigger>
                <SelectContent>
                  {basecoatProducts.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.basecoatProductId ? (
            <p className='text-xs text-destructive'>{errors.basecoatProductId.message}</p>
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
