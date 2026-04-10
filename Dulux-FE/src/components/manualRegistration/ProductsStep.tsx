import type { JSX } from 'react';
import { useEffect } from 'react';

import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui';
import { useGetManualRegistrationProductsQuery } from '#/data-layer/registrations';
import type { ManualRegistrationFormValues, ManualRegistrationProductOption } from '#/types/manualRegistration';

interface AdditionalPaintPairFieldsProps {
  index: number;
  pairId: string;
  topcoatProducts: ManualRegistrationProductOption[];
  allBasecoatProducts: ManualRegistrationProductOption[];
  topcoatBasecoatMap: Record<string, ManualRegistrationProductOption[]>;
  isProductsLoading: boolean;
  onRemove: () => void;
}

const AdditionalPaintPairFields = ({
  index,
  pairId,
  topcoatProducts,
  allBasecoatProducts,
  topcoatBasecoatMap,
  isProductsLoading,
  onRemove,
}: AdditionalPaintPairFieldsProps): JSX.Element => {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<ManualRegistrationFormValues>();

  const selectedTopcoat = useWatch({ control, name: `additionalPaintPairs.${index}.topcoatProductId` });
  const selectedBasecoat = useWatch({ control, name: `additionalPaintPairs.${index}.basecoatProductId` });
  const hasBasecoat = Boolean(selectedBasecoat);
  const basecoatProducts = selectedTopcoat ? (topcoatBasecoatMap[selectedTopcoat] ?? []) : allBasecoatProducts;
  const pairErrors = errors.additionalPaintPairs?.[index];

  useEffect(() => {
    if (!selectedBasecoat) {
      return;
    }

    const hasMatchingBasecoat = basecoatProducts.some(product => product.id === selectedBasecoat);
    if (!hasMatchingBasecoat) {
      setValue(`additionalPaintPairs.${index}.basecoatProductId`, '', { shouldValidate: true });
      setValue(`additionalPaintPairs.${index}.basecoatQuantity`, '', { shouldValidate: true });
    }
  }, [basecoatProducts, index, selectedBasecoat, setValue]);

  return (
    <article key={pairId} className='space-y-4 rounded-md border border-border p-4'>
      <div className='flex items-center justify-between gap-2'>
        <h4 className='text-sm font-semibold text-text-primary'>Paint Pair {index + 2}</h4>
        <Button type='button' variant='outline' onClick={onRemove}>
          Remove Pair
        </Button>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <label className='space-y-2'>
          <span className='text-sm font-medium text-text-primary'>
            Topcoat Product <span className='text-destructive'>*</span>
          </span>
          <Controller
            control={control}
            name={`additionalPaintPairs.${index}.topcoatProductId`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isProductsLoading}>
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
          <span className='text-sm font-medium text-text-primary'>
            Topcoat Quantity (liters) <span className='text-destructive'>*</span>
          </span>
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
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isProductsLoading || !selectedTopcoat}
              >
                <SelectTrigger aria-label='Select basecoat product'>
                  <SelectValue placeholder='Select basecoat product' />
                </SelectTrigger>
                <SelectContent>
                  {!selectedTopcoat ? (
                    <SelectItem value={`__select_topcoat_first__${index}`} disabled>
                      Select a topcoat first
                    </SelectItem>
                  ) : basecoatProducts.length > 0 ? (
                    basecoatProducts.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.label}
                      </SelectItem>
                    ))
                  ) : selectedTopcoat ? (
                    <SelectItem value={`__no_basecoat_available__${index}`} disabled>
                      No basecoat available for selected topcoat
                    </SelectItem>
                  ) : null}
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
          <Input
            placeholder='e.g. 5 or 5.5'
            disabled={!hasBasecoat}
            {...register(`additionalPaintPairs.${index}.basecoatQuantity`)}
          />
          {pairErrors?.basecoatQuantity ? (
            <p className='text-xs text-destructive'>{pairErrors.basecoatQuantity.message}</p>
          ) : null}
        </label>
      </div>
    </article>
  );
};

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
  const allBasecoatProducts = manualProductsQuery.data?.basecoatProducts ?? [];
  const topcoatBasecoatMap = Object.fromEntries(
    topcoatProducts.map(product => [product.id, product.linkedBasecoats ?? []])
  ) as Record<string, ManualRegistrationProductOption[]>;
  const basecoatProducts = selectedTopcoat ? (topcoatBasecoatMap[selectedTopcoat] ?? []) : allBasecoatProducts;
  const productLoadError = manualProductsQuery.error?.message ?? 'Unable to load product options.';

  const appendPaintPair = (): void => {
    append({
      topcoatProductId: '',
      topcoatQuantity: '',
      basecoatProductId: '',
      basecoatQuantity: '',
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
              <span className='text-sm font-medium text-text-primary'>
                Topcoat Product <span className='text-destructive'>*</span>
              </span>
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
              <span className='text-sm font-medium text-text-primary'>
                Topcoat Quantity (liters) <span className='text-destructive'>*</span>
              </span>
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
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={manualProductsQuery.isLoading || !selectedTopcoat}
                  >
                    <SelectTrigger aria-label='Select basecoat product'>
                      <SelectValue placeholder='Select basecoat product' />
                    </SelectTrigger>
                    <SelectContent>
                      {!selectedTopcoat ? (
                        <SelectItem value='__select_topcoat_first__' disabled>
                          Select a topcoat first
                        </SelectItem>
                      ) : basecoatProducts.length > 0 ? (
                        basecoatProducts.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.label}
                          </SelectItem>
                        ))
                      ) : selectedTopcoat ? (
                        <SelectItem value='__no_basecoat_available__' disabled>
                          No basecoat available for selected topcoat
                        </SelectItem>
                      ) : null}
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
        </article>

        {fields.map((field, index) => (
          <AdditionalPaintPairFields
            key={field.id}
            index={index}
            pairId={field.id}
            topcoatProducts={topcoatProducts}
            allBasecoatProducts={allBasecoatProducts}
            topcoatBasecoatMap={topcoatBasecoatMap}
            isProductsLoading={manualProductsQuery.isLoading}
            onRemove={() => remove(index)}
          />
        ))}
      </div>

      <div>
        <Button type='button' variant='outline' onClick={appendPaintPair}>
          Add Pair
        </Button>
      </div>
    </section>
  );
};
