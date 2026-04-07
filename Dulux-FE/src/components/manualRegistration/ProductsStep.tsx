import type { JSX } from 'react';
import { useEffect } from 'react';

import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui';
import { useGetProductBasecoatsQuery } from '#/data-layer/products';
import { useGetManualRegistrationProductsQuery } from '#/data-layer/registrations';
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
    setValue,
    formState: { errors },
  } = useFormContext<ManualRegistrationFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'additionalPaintPairs',
  });

  const manualProductsQuery = useGetManualRegistrationProductsQuery();

  const selectedTopcoat = useWatch({ control, name: 'topcoatProductId' });
  const selectedBasecoat = useWatch({ control, name: 'basecoatProductId' });
  const hasBasecoat = Boolean(selectedBasecoat);
  const topcoatProducts = manualProductsQuery.data?.topcoatProducts ?? [];
  const linkedBasecoatQuery = useGetProductBasecoatsQuery(selectedTopcoat);
  const basecoatProducts = selectedTopcoat
    ? (linkedBasecoatQuery.data?.results.map(product => ({ id: String(product.id), label: product.name })) ?? [])
    : (manualProductsQuery.data?.basecoatProducts ?? []);
  const productLoadError = manualProductsQuery.error?.message ?? 'Unable to load product options.';
  const linkedBasecoatLoadError =
    linkedBasecoatQuery.error?.message ?? 'Unable to load linked basecoats for the selected topcoat.';
  const allBasecoatProducts = manualProductsQuery.data?.basecoatProducts ?? [];

  const appendPaintPair = (): void => {
    append({
      topcoatProductId: '',
      topcoatQuantity: '',
      basecoatProductId: '',
      basecoatQuantity: '',
      topcoatInvoice: null,
      basecoatInvoice: null,
    });
  };

  useEffect(() => {
    if (!selectedBasecoat) {
      return;
    }

    const hasMatchingBasecoat = basecoatProducts.some(product => product.id === selectedBasecoat);
    if (!hasMatchingBasecoat) {
      setValue('basecoatProductId', '', { shouldValidate: true });
      setValue('basecoatQuantity', '', { shouldValidate: true });
      setValue('basecoatInvoice', null, { shouldValidate: true });
    }
  }, [basecoatProducts, selectedBasecoat, setValue]);

  return (
    <section className='space-y-4 wf-card wf-card-p5'>
      <header>
        <h3 className='text-lg font-semibold text-text-primary'>Products</h3>
        <p className='text-sm text-text-muted'>Choose topcoat/basecoat products and add purchased quantities.</p>
      </header>

      <div className='space-y-4'>
        <article className='space-y-4 rounded-md border border-border p-4'>
          <h4 className='text-sm font-semibold text-text-primary'>Paint Pair 1</h4>
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
              {errors.topcoatQuantity ? (
                <p className='text-xs text-destructive'>{errors.topcoatQuantity.message}</p>
              ) : null}
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
              {selectedTopcoat && linkedBasecoatQuery.isLoading ? (
                <p className='text-xs text-text-muted'>Loading linked basecoats...</p>
              ) : null}
              {selectedTopcoat && linkedBasecoatQuery.isError ? (
                <p className='text-xs text-destructive'>{linkedBasecoatLoadError}</p>
              ) : null}
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
        </article>

        {fields.map((field, index) => {
          const pairErrors = errors.additionalPaintPairs?.[index];

          return (
            <article key={field.id} className='space-y-4 rounded-md border border-border p-4'>
              <div className='flex items-center justify-between gap-2'>
                <h4 className='text-sm font-semibold text-text-primary'>Paint Pair {index + 2}</h4>
                <Button type='button' variant='outline' onClick={() => remove(index)}>
                  Remove Pair
                </Button>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <label className='space-y-2'>
                  <span className='text-sm font-medium text-text-primary'>Topcoat Product</span>
                  <Controller
                    control={control}
                    name={`additionalPaintPairs.${index}.topcoatProductId`}
                    render={({ field: nestedField }) => (
                      <Select
                        value={nestedField.value}
                        onValueChange={nestedField.onChange}
                        disabled={manualProductsQuery.isLoading}
                      >
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
                  {pairErrors?.topcoatProductId ? (
                    <p className='text-xs text-destructive'>{pairErrors.topcoatProductId.message}</p>
                  ) : null}
                </label>

                <label className='space-y-2'>
                  <span className='text-sm font-medium text-text-primary'>Topcoat Quantity (liters)</span>
                  <Input placeholder='e.g. 8 or 8.5' {...register(`additionalPaintPairs.${index}.topcoatQuantity`)} />
                  {pairErrors?.topcoatQuantity ? (
                    <p className='text-xs text-destructive'>{pairErrors.topcoatQuantity.message}</p>
                  ) : null}
                </label>

                <label className='space-y-2'>
                  <span className='text-sm font-medium text-text-primary'>Basecoat Product (optional)</span>
                  <Controller
                    control={control}
                    name={`additionalPaintPairs.${index}.basecoatProductId`}
                    render={({ field: nestedField }) => (
                      <Select
                        value={nestedField.value}
                        onValueChange={nestedField.onChange}
                        disabled={manualProductsQuery.isLoading}
                      >
                        <SelectTrigger aria-label='Select basecoat product'>
                          <SelectValue placeholder='Select basecoat product' />
                        </SelectTrigger>
                        <SelectContent>
                          {allBasecoatProducts.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {pairErrors?.basecoatProductId ? (
                    <p className='text-xs text-destructive'>{pairErrors.basecoatProductId.message}</p>
                  ) : null}
                </label>

                <label className='space-y-2'>
                  <span className='text-sm font-medium text-text-primary'>Basecoat Quantity (liters)</span>
                  <Input placeholder='e.g. 5 or 5.5' {...register(`additionalPaintPairs.${index}.basecoatQuantity`)} />
                  {pairErrors?.basecoatQuantity ? (
                    <p className='text-xs text-destructive'>{pairErrors.basecoatQuantity.message}</p>
                  ) : null}
                </label>
              </div>
            </article>
          );
        })}
      </div>

      <div>
        <Button type='button' variant='outline' onClick={appendPaintPair}>
          Add Pair
        </Button>
      </div>
    </section>
  );
};
