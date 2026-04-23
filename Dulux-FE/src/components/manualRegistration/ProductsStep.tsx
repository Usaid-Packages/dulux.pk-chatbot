import type { JSX, UIEvent } from 'react';
import { useCallback, useEffect } from 'react';

import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui';
import { REGISTRATION_PRODUCT_TYPES, UI_TEXT } from '#/constants';
import { useGetManualRegistrationProductOptionsInfiniteQuery } from '#/data-layer/registrations';
import type { ManualRegistrationFormValues, ManualRegistrationProductOption } from '#/types/manualRegistration';

interface AdditionalPaintPairFieldsProps {
  index: number;
  pairId: string;
  topcoatProducts: ManualRegistrationProductOption[];
  isTopcoatLoading: boolean;
  isTopcoatFetchingNextPage: boolean;
  topcoatHasNextPage: boolean;
  onTopcoatScroll: (event: UIEvent<HTMLDivElement>) => void;
  onRemove: (pairId: string) => void;
}

const SCROLL_BOTTOM_THRESHOLD_PX = 24;

const getProductOptionLabel = (product: ManualRegistrationProductOption): string => {
  if (typeof product.warrantyYears === 'number' && product.warrantyYears > 0) {
    return `${product.label} (${product.warrantyYears} year warranty)`;
  }

  return product.label;
};

const AdditionalPaintPairFields = ({
  index,
  pairId,
  topcoatProducts,
  isTopcoatLoading,
  isTopcoatFetchingNextPage,
  topcoatHasNextPage,
  onTopcoatScroll,
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
  const basecoatQuery = useGetManualRegistrationProductOptionsInfiniteQuery(
    REGISTRATION_PRODUCT_TYPES.BASECOAT,
    selectedTopcoat
  );
  const hasBasecoat = Boolean(selectedBasecoat);
  const basecoatProducts = basecoatQuery.options;
  const pairErrors = errors.additionalPaintPairs?.[index];
  const handleRemovePairClick = (): void => {
    onRemove(pairId);
  };

  const handleBasecoatScroll = useCallback(
    (event: UIEvent<HTMLDivElement>): void => {
      const scrollTarget = event.currentTarget;
      const reachedBottom =
        scrollTarget.scrollTop + scrollTarget.clientHeight >= scrollTarget.scrollHeight - SCROLL_BOTTOM_THRESHOLD_PX;

      if (!reachedBottom || !basecoatQuery.hasNextPage || basecoatQuery.isFetchingNextPage) {
        return;
      }

      void basecoatQuery.fetchNextPage();
    },
    [basecoatQuery]
  );

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
        <Button type='button' variant='outline' onClick={handleRemovePairClick}>
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
              <Select value={field.value} onValueChange={field.onChange} disabled={isTopcoatLoading}>
                <SelectTrigger aria-label='Select topcoat product'>
                  <SelectValue placeholder={UI_TEXT.SELECT_TOPCOAT_PRODUCT_PLACEHOLDER} />
                </SelectTrigger>
                <SelectContent onScroll={onTopcoatScroll}>
                  {topcoatProducts.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {getProductOptionLabel(product)}
                    </SelectItem>
                  ))}
                  {isTopcoatFetchingNextPage ? (
                    <SelectItem value={`__loading_topcoats_${index}`} disabled>
                      Loading more topcoats...
                    </SelectItem>
                  ) : null}
                  {topcoatHasNextPage ? (
                    <SelectItem value={`__scroll_topcoat_more_${index}`} disabled>
                      Scroll to load more topcoats
                    </SelectItem>
                  ) : null}
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
                disabled={isTopcoatLoading || !selectedTopcoat || basecoatQuery.isLoading}
              >
                <SelectTrigger aria-label='Select basecoat product'>
                  <SelectValue placeholder={UI_TEXT.SELECT_BASECOAT_PRODUCT_PLACEHOLDER} />
                </SelectTrigger>
                <SelectContent onScroll={handleBasecoatScroll}>
                  {!selectedTopcoat ? (
                    <SelectItem value={`__select_topcoat_first__${index}`} disabled>
                      {UI_TEXT.SELECT_A_TOPCOAT_FIRST}
                    </SelectItem>
                  ) : basecoatQuery.isLoading ? (
                    <SelectItem value={`__loading_basecoats_${index}`} disabled>
                      Loading basecoats...
                    </SelectItem>
                  ) : basecoatProducts.length > 0 ? (
                    basecoatProducts.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {getProductOptionLabel(product)}
                      </SelectItem>
                    ))
                  ) : selectedTopcoat ? (
                    <SelectItem value={`__no_basecoat_available__${index}`} disabled>
                      {UI_TEXT.NO_BASECOAT_AVAILABLE_FOR_SELECTED_TOPCOAT}
                    </SelectItem>
                  ) : null}
                  {basecoatQuery.isFetchingNextPage ? (
                    <SelectItem value={`__loading_more_basecoats_${index}`} disabled>
                      Loading more basecoats...
                    </SelectItem>
                  ) : null}
                  {basecoatQuery.hasNextPage ? (
                    <SelectItem value={`__scroll_basecoat_more_${index}`} disabled>
                      Scroll to load more basecoats
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

  const topcoatQuery = useGetManualRegistrationProductOptionsInfiniteQuery(REGISTRATION_PRODUCT_TYPES.TOPCOAT);

  const selectedTopcoat = useWatch({ control, name: 'topcoatProductId' });
  const selectedBasecoat = useWatch({ control, name: 'basecoatProductId' });
  const basecoatQuery = useGetManualRegistrationProductOptionsInfiniteQuery(
    REGISTRATION_PRODUCT_TYPES.BASECOAT,
    selectedTopcoat
  );
  const hasBasecoat = Boolean(selectedBasecoat);
  const topcoatProducts = topcoatQuery.options;
  const basecoatProducts = basecoatQuery.options;
  const productLoadError = topcoatQuery.error?.message ?? 'Unable to load product options.';

  const handleTopcoatScroll = useCallback(
    (event: UIEvent<HTMLDivElement>): void => {
      const scrollTarget = event.currentTarget;
      const reachedBottom =
        scrollTarget.scrollTop + scrollTarget.clientHeight >= scrollTarget.scrollHeight - SCROLL_BOTTOM_THRESHOLD_PX;

      if (!reachedBottom || !topcoatQuery.hasNextPage || topcoatQuery.isFetchingNextPage) {
        return;
      }

      void topcoatQuery.fetchNextPage();
    },
    [topcoatQuery]
  );

  const handleBasecoatScroll = useCallback(
    (event: UIEvent<HTMLDivElement>): void => {
      const scrollTarget = event.currentTarget;
      const reachedBottom =
        scrollTarget.scrollTop + scrollTarget.clientHeight >= scrollTarget.scrollHeight - SCROLL_BOTTOM_THRESHOLD_PX;

      if (!reachedBottom || !basecoatQuery.hasNextPage || basecoatQuery.isFetchingNextPage) {
        return;
      }

      void basecoatQuery.fetchNextPage();
    },
    [basecoatQuery]
  );

  const appendPaintPair = (): void => {
    append({
      topcoatProductId: '',
      topcoatQuantity: '',
      basecoatProductId: '',
      basecoatQuantity: '',
    });
  };

  const handleRemovePaintPair = useCallback(
    (pairId: string): void => {
      const pairIndex = fields.findIndex(field => field.id === pairId);
      if (pairIndex < 0) {
        return;
      }

      remove(pairIndex);
    },
    [fields, remove]
  );

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
                  <Select value={field.value} onValueChange={field.onChange} disabled={topcoatQuery.isLoading}>
                    <SelectTrigger aria-label='Select topcoat product'>
                      <SelectValue placeholder={UI_TEXT.SELECT_TOPCOAT_PRODUCT_PLACEHOLDER} />
                    </SelectTrigger>
                    <SelectContent onScroll={handleTopcoatScroll}>
                      {topcoatProducts.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {getProductOptionLabel(product)}
                        </SelectItem>
                      ))}
                      {topcoatQuery.isFetchingNextPage ? (
                        <SelectItem value='__loading_topcoats' disabled>
                          Loading more topcoats...
                        </SelectItem>
                      ) : null}
                      {topcoatQuery.hasNextPage ? (
                        <SelectItem value='__scroll_topcoat_more' disabled>
                          Scroll to load more topcoats
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                )}
              />
              {topcoatQuery.isLoading ? <p className='text-xs text-text-muted'>Loading products...</p> : null}
              {topcoatQuery.isError ? <p className='text-xs text-destructive'>{productLoadError}</p> : null}
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
                    disabled={topcoatQuery.isLoading || !selectedTopcoat || basecoatQuery.isLoading}
                  >
                    <SelectTrigger aria-label='Select basecoat product'>
                      <SelectValue placeholder={UI_TEXT.SELECT_BASECOAT_PRODUCT_PLACEHOLDER} />
                    </SelectTrigger>
                    <SelectContent onScroll={handleBasecoatScroll}>
                      {!selectedTopcoat ? (
                        <SelectItem value='__select_topcoat_first__' disabled>
                          {UI_TEXT.SELECT_A_TOPCOAT_FIRST}
                        </SelectItem>
                      ) : basecoatQuery.isLoading ? (
                        <SelectItem value='__loading_basecoats' disabled>
                          Loading basecoats...
                        </SelectItem>
                      ) : basecoatProducts.length > 0 ? (
                        basecoatProducts.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {getProductOptionLabel(product)}
                          </SelectItem>
                        ))
                      ) : selectedTopcoat ? (
                        <SelectItem value='__no_basecoat_available__' disabled>
                          {UI_TEXT.NO_BASECOAT_AVAILABLE_FOR_SELECTED_TOPCOAT}
                        </SelectItem>
                      ) : null}
                      {basecoatQuery.isFetchingNextPage ? (
                        <SelectItem value='__loading_more_basecoats' disabled>
                          Loading more basecoats...
                        </SelectItem>
                      ) : null}
                      {basecoatQuery.hasNextPage ? (
                        <SelectItem value='__scroll_basecoat_more' disabled>
                          Scroll to load more basecoats
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
            isTopcoatLoading={topcoatQuery.isLoading}
            isTopcoatFetchingNextPage={topcoatQuery.isFetchingNextPage}
            topcoatHasNextPage={topcoatQuery.hasNextPage}
            onTopcoatScroll={handleTopcoatScroll}
            onRemove={handleRemovePaintPair}
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
