import type { JSX, UIEvent } from 'react';
import { useCallback, useEffect } from 'react';

import type { FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui';
import { REGISTRATION_PRODUCT_TYPES, UI_TEXT } from '#/constants';
import { useGetManualRegistrationProductOptionsInfiniteQuery } from '#/data-layer/registrations';
import type {
  ManualRegistrationFormValues,
  ManualRegistrationProductOption,
  ManualRegistrationSelectionType,
} from '#/types/manualRegistration';

const SCROLL_BOTTOM_THRESHOLD_PX = 24;

type PairPrefix = '' | `additionalPaintPairs.${number}.`;

const getProductOptionLabel = (product: ManualRegistrationProductOption): string => {
  if (typeof product.warrantyYears === 'number' && product.warrantyYears > 0) {
    return `${product.label} (${product.warrantyYears} year warranty)`;
  }

  return product.label;
};

const SelectionTypeButtons = ({
  selectedType,
  onChange,
}: {
  selectedType: '' | ManualRegistrationSelectionType;
  onChange: (type: ManualRegistrationSelectionType) => void;
}): JSX.Element => {
  return (
    <div className='space-y-2'>
      <span className='text-sm font-medium text-text-primary'>Choose Paint Type</span>
      <div className='flex flex-wrap gap-2'>
        <Button
          type='button'
          variant={selectedType === 'SPECIALIST' ? 'default' : 'outline'}
          onClick={() => onChange('SPECIALIST')}
        >
          Specialized Coat
        </Button>
        <Button
          type='button'
          variant={selectedType === 'TOPCOAT' ? 'default' : 'outline'}
          onClick={() => onChange('TOPCOAT')}
        >
          Topcoat + Basecoat
        </Button>
      </div>
    </div>
  );
};

const clearFieldsForType = (
  setValue: UseFormSetValue<ManualRegistrationFormValues>,
  prefix: PairPrefix,
  type: '' | ManualRegistrationSelectionType
): void => {
  const setEmpty = (field: string): void => {
    setValue(`${prefix}${field}`, '', { shouldValidate: true });
  };

  if (type === 'SPECIALIST') {
    setEmpty('topcoatProductId');
    setEmpty('topcoatQuantity');
    setEmpty('basecoatProductId');
    setEmpty('basecoatQuantity');
    return;
  }

  if (type === 'TOPCOAT') {
    setEmpty('specialistProductId');
    setEmpty('specialistQuantity');
    return;
  }

  setEmpty('specialistProductId');
  setEmpty('specialistQuantity');
  setEmpty('topcoatProductId');
  setEmpty('topcoatQuantity');
  setEmpty('basecoatProductId');
  setEmpty('basecoatQuantity');
};

interface PairFieldsProps {
  index?: number;
  specialistProducts: ManualRegistrationProductOption[];
  topcoatProducts: ManualRegistrationProductOption[];
  isSpecialistLoading: boolean;
  isSpecialistFetchingNextPage: boolean;
  specialistHasNextPage: boolean;
  onSpecialistScroll: (event: UIEvent<HTMLDivElement>) => void;
  isTopcoatLoading: boolean;
  isTopcoatFetchingNextPage: boolean;
  topcoatHasNextPage: boolean;
  onTopcoatScroll: (event: UIEvent<HTMLDivElement>) => void;
}

const PairFields = ({
  index,
  specialistProducts,
  topcoatProducts,
  isSpecialistLoading,
  isSpecialistFetchingNextPage,
  specialistHasNextPage,
  onSpecialistScroll,
  isTopcoatLoading,
  isTopcoatFetchingNextPage,
  topcoatHasNextPage,
  onTopcoatScroll,
}: PairFieldsProps): JSX.Element => {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<ManualRegistrationFormValues>();

  const prefix = typeof index === 'number' ? (`additionalPaintPairs.${index}.` as PairPrefix) : '';
  const selectionTypePath = `${prefix}selectionType` as const;
  const specialistPath = `${prefix}specialistProductId` as const;
  const specialistQtyPath = `${prefix}specialistQuantity` as const;
  const topcoatPath = `${prefix}topcoatProductId` as const;
  const topcoatQtyPath = `${prefix}topcoatQuantity` as const;
  const basecoatPath = `${prefix}basecoatProductId` as const;
  const basecoatQtyPath = `${prefix}basecoatQuantity` as const;

  const selectedType = useWatch({ control, name: selectionTypePath }) as '' | ManualRegistrationSelectionType;
  const selectedTopcoat = useWatch({ control, name: topcoatPath }) as string;
  const selectedBasecoat = useWatch({ control, name: basecoatPath }) as string;

  const isSpecialistMode = selectedType === 'SPECIALIST';
  const isTopcoatMode = selectedType === 'TOPCOAT';

  const basecoatQuery = useGetManualRegistrationProductOptionsInfiniteQuery(
    REGISTRATION_PRODUCT_TYPES.BASECOAT,
    selectedTopcoat
  );
  const basecoatProducts = basecoatQuery.options;

  const pairErrors: FieldErrors<ManualRegistrationFormValues> =
    typeof index === 'number'
      ? ((errors.additionalPaintPairs?.[index] ?? {}) as FieldErrors<ManualRegistrationFormValues>)
      : errors;

  useEffect(() => {
    clearFieldsForType(setValue, prefix, selectedType);
  }, [prefix, selectedType, setValue]);

  useEffect(() => {
    if (!isTopcoatMode || !selectedBasecoat) {
      return;
    }

    const hasMatchingBasecoat = basecoatProducts.some(product => product.id === selectedBasecoat);
    if (!hasMatchingBasecoat) {
      setValue(basecoatPath, '', { shouldValidate: true });
      setValue(basecoatQtyPath, '', { shouldValidate: true });
    }
  }, [basecoatPath, basecoatProducts, basecoatQtyPath, isTopcoatMode, selectedBasecoat, setValue]);

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

  return (
    <div className='space-y-4'>
      <SelectionTypeButtons
        selectedType={selectedType}
        onChange={value => setValue(selectionTypePath, value, { shouldValidate: true })}
      />
      {pairErrors?.selectionType ? (
        <p className='text-xs text-destructive'>{pairErrors.selectionType.message}</p>
      ) : null}

      {isSpecialistMode ? (
        <div className='grid gap-4 md:grid-cols-2'>
          <label className='space-y-2'>
            <span className='text-sm font-medium text-text-primary'>Specialist Product</span>
            <Controller
              control={control}
              name={specialistPath}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSpecialistLoading}>
                  <SelectTrigger aria-label='Select specialist product'>
                    <SelectValue placeholder='Select specialist product' />
                  </SelectTrigger>
                  <SelectContent onScroll={onSpecialistScroll}>
                    {isSpecialistLoading ? (
                      <SelectItem value='__loading_specialists' disabled>
                        Loading specialist products...
                      </SelectItem>
                    ) : specialistProducts.length > 0 ? (
                      specialistProducts.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {getProductOptionLabel(product)}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value='__no_specialists' disabled>
                        No specialist coat available
                      </SelectItem>
                    )}
                    {isSpecialistFetchingNextPage ? (
                      <SelectItem value='__loading_specialists_next' disabled>
                        Loading more specialist products...
                      </SelectItem>
                    ) : null}
                    {specialistHasNextPage ? (
                      <SelectItem value='__scroll_specialists' disabled>
                        Scroll to load more specialists
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              )}
            />
            {pairErrors?.specialistProductId ? (
              <p className='text-xs text-destructive'>{pairErrors.specialistProductId.message}</p>
            ) : null}
          </label>

          <label className='space-y-2'>
            <span className='text-sm font-medium text-text-primary'>Specialist Quantity (liters)</span>
            <Input placeholder='e.g. 8 or 8.5' {...register(specialistQtyPath)} />
            {pairErrors?.specialistQuantity ? (
              <p className='text-xs text-destructive'>{pairErrors.specialistQuantity.message}</p>
            ) : null}
          </label>
        </div>
      ) : null}

      {isTopcoatMode ? (
        <div className='grid gap-4 md:grid-cols-2'>
          <label className='space-y-2'>
            <span className='text-sm font-medium text-text-primary'>Topcoat Product</span>
            <Controller
              control={control}
              name={topcoatPath}
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
                      <SelectItem value='__loading_topcoats' disabled>
                        Loading more topcoats...
                      </SelectItem>
                    ) : null}
                    {topcoatHasNextPage ? (
                      <SelectItem value='__scroll_topcoats' disabled>
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
            <span className='text-sm font-medium text-text-primary'>Topcoat Quantity (liters)</span>
            <Input placeholder='e.g. 8 or 8.5' {...register(topcoatQtyPath)} />
            {pairErrors?.topcoatQuantity ? (
              <p className='text-xs text-destructive'>{pairErrors.topcoatQuantity.message}</p>
            ) : null}
          </label>

          <label className='space-y-2'>
            <span className='text-sm font-medium text-text-primary'>Basecoat Product (optional)</span>
            <Controller
              control={control}
              name={basecoatPath}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!selectedTopcoat || basecoatQuery.isLoading}
                >
                  <SelectTrigger aria-label='Select basecoat product'>
                    <SelectValue placeholder={UI_TEXT.SELECT_BASECOAT_PRODUCT_PLACEHOLDER} />
                  </SelectTrigger>
                  <SelectContent onScroll={handleBasecoatScroll}>
                    {!selectedTopcoat ? (
                      <SelectItem value='__topcoat_first' disabled>
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
                    ) : (
                      <SelectItem value='__no_basecoat' disabled>
                        {UI_TEXT.NO_BASECOAT_AVAILABLE_FOR_SELECTED_TOPCOAT}
                      </SelectItem>
                    )}
                    {basecoatQuery.isFetchingNextPage ? (
                      <SelectItem value='__loading_more_basecoats' disabled>
                        Loading more basecoats...
                      </SelectItem>
                    ) : null}
                    {basecoatQuery.hasNextPage ? (
                      <SelectItem value='__scroll_basecoats' disabled>
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
            <Input placeholder='e.g. 5 or 5.5' disabled={!selectedBasecoat} {...register(basecoatQtyPath)} />
            {pairErrors?.basecoatQuantity ? (
              <p className='text-xs text-destructive'>{pairErrors.basecoatQuantity.message}</p>
            ) : null}
          </label>
        </div>
      ) : null}
    </div>
  );
};

export const ProductsStep = (): JSX.Element => {
  const {
    control,
    formState: { errors },
  } = useFormContext<ManualRegistrationFormValues>();

  const { fields, append, remove } = useFieldArray({ control, name: 'additionalPaintPairs' });

  const specialistQuery = useGetManualRegistrationProductOptionsInfiniteQuery(REGISTRATION_PRODUCT_TYPES.SPECIALIST);
  const topcoatQuery = useGetManualRegistrationProductOptionsInfiniteQuery(REGISTRATION_PRODUCT_TYPES.TOPCOAT);

  const handleSpecialistScroll = useCallback(
    (event: UIEvent<HTMLDivElement>): void => {
      const scrollTarget = event.currentTarget;
      const reachedBottom =
        scrollTarget.scrollTop + scrollTarget.clientHeight >= scrollTarget.scrollHeight - SCROLL_BOTTOM_THRESHOLD_PX;

      if (!reachedBottom || !specialistQuery.hasNextPage || specialistQuery.isFetchingNextPage) {
        return;
      }

      void specialistQuery.fetchNextPage();
    },
    [specialistQuery]
  );

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

  const appendPaintPair = (): void => {
    append({
      selectionType: '',
      specialistProductId: '',
      specialistQuantity: '',
      topcoatProductId: '',
      topcoatQuantity: '',
      basecoatProductId: '',
      basecoatQuantity: '',
    });
  };

  return (
    <section className='space-y-4 wf-card wf-card-p5'>
      <header>
        <h3 className='text-lg font-semibold text-text-primary'>Products</h3>
        <p className='text-sm text-text-muted'>
          Choose Specialized or Topcoat first, then enter only required paint fields.
        </p>
      </header>

      <article className='space-y-4 rounded-md border border-border p-4'>
        <h4 className='text-sm font-semibold text-text-primary'>Paint Pair 1</h4>
        <PairFields
          specialistProducts={specialistQuery.options}
          topcoatProducts={topcoatQuery.options}
          isSpecialistLoading={specialistQuery.isLoading}
          isSpecialistFetchingNextPage={specialistQuery.isFetchingNextPage}
          specialistHasNextPage={specialistQuery.hasNextPage}
          onSpecialistScroll={handleSpecialistScroll}
          isTopcoatLoading={topcoatQuery.isLoading}
          isTopcoatFetchingNextPage={topcoatQuery.isFetchingNextPage}
          topcoatHasNextPage={topcoatQuery.hasNextPage}
          onTopcoatScroll={handleTopcoatScroll}
        />
      </article>

      {fields.map((field, index) => (
        <article key={field.id} className='space-y-4 rounded-md border border-border p-4'>
          <div className='flex items-center justify-between gap-2'>
            <h4 className='text-sm font-semibold text-text-primary'>Paint Pair {index + 2}</h4>
            <Button type='button' variant='outline' onClick={() => remove(index)}>
              Remove Pair
            </Button>
          </div>

          <PairFields
            index={index}
            specialistProducts={specialistQuery.options}
            topcoatProducts={topcoatQuery.options}
            isSpecialistLoading={specialistQuery.isLoading}
            isSpecialistFetchingNextPage={specialistQuery.isFetchingNextPage}
            specialistHasNextPage={specialistQuery.hasNextPage}
            onSpecialistScroll={handleSpecialistScroll}
            isTopcoatLoading={topcoatQuery.isLoading}
            isTopcoatFetchingNextPage={topcoatQuery.isFetchingNextPage}
            topcoatHasNextPage={topcoatQuery.hasNextPage}
            onTopcoatScroll={handleTopcoatScroll}
          />
        </article>
      ))}

      <div>
        <Button type='button' variant='outline' onClick={appendPaintPair}>
          Add Pair
        </Button>
      </div>

      {errors.additionalPaintPairs ? null : null}
    </section>
  );
};
