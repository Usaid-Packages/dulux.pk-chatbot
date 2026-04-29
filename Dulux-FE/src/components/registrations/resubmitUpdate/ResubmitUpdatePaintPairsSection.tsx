import { memo } from 'react';
import type { JSX, MouseEvent } from 'react';

import type { Control, FieldErrors, UseFormClearErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';

import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui';
import { Input } from '#/components/ui/Input';
import { UI_TEXT } from '#/constants';
import {
  NO_BASECOAT_AVAILABLE_TEXT,
  RESUBMIT_FIELD_LABELS,
  SELECT_TOPCOAT_FIRST_TEXT,
} from '#/constants/registrations';
import type { ResubmitUpdateFormValues } from '#/schemas/registrations';
import type { RegistrationPaintPair, RegistrationRejectionField } from '#/types/registrations';
import type { ResubmitUpdatePaintPairRowViewModel, ResubmitUpdateSelectOption } from './useResubmitUpdateForm';

interface ResubmitUpdatePaintPairsSectionProps {
  requestedFieldNames: RegistrationRejectionField['fieldName'][];
  existingPaintPairs: RegistrationPaintPair[];
  control: Control<ResubmitUpdateFormValues>;
  register: UseFormRegister<ResubmitUpdateFormValues>;
  setValue: UseFormSetValue<ResubmitUpdateFormValues>;
  clearErrors: UseFormClearErrors<ResubmitUpdateFormValues>;
  errors: FieldErrors<ResubmitUpdateFormValues>;
  paintPairRows: ResubmitUpdatePaintPairRowViewModel[];
  topcoatOptions: ResubmitUpdateSelectOption[];
  isPaintProductsLoading: boolean;
  isPaintProductsError: boolean;
  paintProductsErrorMessage: string;
  onAddPaintPair: () => void;
  onRemovePaintPair: (event: MouseEvent<HTMLButtonElement>) => void;
}

interface ResubmitUpdatePaintPairRowProps {
  row: ResubmitUpdatePaintPairRowViewModel;
  control: Control<ResubmitUpdateFormValues>;
  register: UseFormRegister<ResubmitUpdateFormValues>;
  setValue: UseFormSetValue<ResubmitUpdateFormValues>;
  clearErrors: UseFormClearErrors<ResubmitUpdateFormValues>;
  errors: FieldErrors<ResubmitUpdateFormValues>;
  topcoatOptions: ResubmitUpdateSelectOption[];
  isPaintProductsLoading: boolean;
  isPaintProductsError: boolean;
  paintProductsErrorMessage: string;
  onRemovePaintPair: (event: MouseEvent<HTMLButtonElement>) => void;
  isRemoveDisabled: boolean;
}

const ResubmitUpdatePaintPairRow = memo(
  ({
    row,
    control,
    setValue,
    clearErrors,
    errors,
    topcoatOptions,
    isPaintProductsLoading,
    isPaintProductsError,
    paintProductsErrorMessage,
    onRemovePaintPair,
    isRemoveDisabled,
  }: ResubmitUpdatePaintPairRowProps): JSX.Element => {
    const { rowId, rowIndex, basecoatOptions } = row;
    const selectionType = useWatch({
      control,
      name: `paintPairs.${rowIndex}.selectionType`,
    }) as '' | 'SPECIALIST' | 'TOPCOAT';
    const selectedTopcoatId = useWatch({
      control,
      name: `paintPairs.${rowIndex}.topcoatId`,
    }) as string;
    const selectedBasecoatId = useWatch({
      control,
      name: `paintPairs.${rowIndex}.basecoatId`,
    }) as string;
    const filteredTopcoatOptions = topcoatOptions.filter(option => {
      if (selectionType === 'SPECIALIST') {
        return option.productType === 'SPECIALIST';
      }
      if (selectionType === 'TOPCOAT') {
        return option.productType === 'TOPCOAT';
      }
      return false;
    });

    return (
      <article key={rowId} className='space-y-3 rounded-lg border border-primary/10 p-3'>
        <div className='flex items-center justify-between gap-2'>
          <p className='text-xs font-semibold uppercase tracking-wide text-text-muted'>Paint Pair {rowIndex + 1}</p>
          <Button
            type='button'
            variant='outline'
            className='h-8 rounded-lg border-primary/25 text-xs text-primary'
            data-index={rowIndex}
            onClick={onRemovePaintPair}
            disabled={isRemoveDisabled}
          >
            Remove Pair
          </Button>
        </div>

        <div className='space-y-2'>
          <label className='text-sm font-medium text-text-primary'>Choose Paint Type</label>
          <Controller
            control={control}
            name={`paintPairs.${rowIndex}.selectionType`}
            render={({ field }) => (
              <div className='flex flex-wrap gap-2'>
                <Button
                  type='button'
                  variant={field.value === 'SPECIALIST' ? 'default' : 'outline'}
                  onClick={() => {
                    field.onChange('SPECIALIST');
                    setValue(`paintPairs.${rowIndex}.topcoatId`, '', { shouldValidate: false });
                    setValue(`paintPairs.${rowIndex}.topcoatQuantity`, '', { shouldValidate: false });
                    setValue(`paintPairs.${rowIndex}.basecoatId`, '', { shouldValidate: false });
                    setValue(`paintPairs.${rowIndex}.basecoatQuantity`, '', { shouldValidate: false });
                    clearErrors(`paintPairs.${rowIndex}`);
                  }}
                >
                  Specialized Coat
                </Button>
                <Button
                  type='button'
                  variant={field.value === 'TOPCOAT' ? 'default' : 'outline'}
                  onClick={() => {
                    field.onChange('TOPCOAT');
                    setValue(`paintPairs.${rowIndex}.topcoatId`, '', { shouldValidate: false });
                    setValue(`paintPairs.${rowIndex}.topcoatQuantity`, '', { shouldValidate: false });
                    setValue(`paintPairs.${rowIndex}.basecoatId`, '', { shouldValidate: false });
                    setValue(`paintPairs.${rowIndex}.basecoatQuantity`, '', { shouldValidate: false });
                    clearErrors(`paintPairs.${rowIndex}`);
                  }}
                >
                  Topcoat + Basecoat
                </Button>
              </div>
            )}
          />
          {errors.paintPairs?.[rowIndex]?.selectionType ? (
            <p className='text-xs text-destructive'>{errors.paintPairs[rowIndex]?.selectionType?.message}</p>
          ) : null}
        </div>

        {selectionType ? (
          <div className='grid gap-3 md:grid-cols-2'>
            <div className='space-y-1'>
              <label className='text-xs font-medium text-text-muted'>
                {selectionType === 'SPECIALIST' ? 'Specialist Product' : 'Topcoat Product'}
              </label>
              <Controller
                control={control}
                name={`paintPairs.${rowIndex}.topcoatId`}
                render={({ field: paintPairField }) => (
                  <Select
                    value={paintPairField.value}
                    onValueChange={value => {
                      paintPairField.onChange(value);
                      setValue(`paintPairs.${rowIndex}.basecoatId`, '', { shouldValidate: false });
                      setValue(`paintPairs.${rowIndex}.basecoatQuantity`, '', { shouldValidate: false });
                      clearErrors([
                        `paintPairs.${rowIndex}.topcoatId`,
                        `paintPairs.${rowIndex}.basecoatId`,
                        `paintPairs.${rowIndex}.basecoatQuantity`,
                      ]);
                    }}
                    disabled={isPaintProductsLoading}
                  >
                    <SelectTrigger aria-label='Select topcoat product'>
                      <SelectValue
                        placeholder={
                          selectionType === 'SPECIALIST'
                            ? 'Select specialist product'
                            : UI_TEXT.SELECT_TOPCOAT_PRODUCT_PLACEHOLDER
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTopcoatOptions.length > 0 ? (
                        filteredTopcoatOptions.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.label}
                          </SelectItem>
                        ))
                      ) : selectionType === 'SPECIALIST' ? (
                        <SelectItem value={`__no_specialist__${rowIndex}`} disabled>
                          No specialist coat available
                        </SelectItem>
                      ) : (
                        <SelectItem value={`__no_topcoat__${rowIndex}`} disabled>
                          No topcoat available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {isPaintProductsError && !isPaintProductsLoading ? (
                <p className='text-xs text-destructive'>{paintProductsErrorMessage}</p>
              ) : null}
              {errors.paintPairs?.[rowIndex]?.topcoatId ? (
                <p className='text-xs text-destructive'>{errors.paintPairs[rowIndex]?.topcoatId?.message}</p>
              ) : null}
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-medium text-text-muted'>
                {selectionType === 'SPECIALIST' ? 'Specialist Quantity (liters)' : 'Topcoat Quantity (liters)'}
              </label>
              <Controller
                control={control}
                name={`paintPairs.${rowIndex}.topcoatQuantity`}
                render={({ field }) => (
                  <Input
                    placeholder='e.g. 8 or 8.5'
                    value={field.value}
                    onChange={event => {
                      field.onChange(event);
                      clearErrors(`paintPairs.${rowIndex}.topcoatQuantity`);
                    }}
                  />
                )}
              />
              {errors.paintPairs?.[rowIndex]?.topcoatQuantity ? (
                <p className='text-xs text-destructive'>{errors.paintPairs[rowIndex]?.topcoatQuantity?.message}</p>
              ) : null}
            </div>

            {selectionType === 'TOPCOAT' ? (
              <>
                <div className='space-y-1'>
                  <label className='text-xs font-medium text-text-muted'>Basecoat Product (optional)</label>
                  <Controller
                    control={control}
                    name={`paintPairs.${rowIndex}.basecoatId`}
                    render={({ field: paintPairField }) => (
                      <Select
                        value={paintPairField.value}
                        onValueChange={value => {
                          paintPairField.onChange(value);
                          clearErrors([`paintPairs.${rowIndex}.basecoatId`, `paintPairs.${rowIndex}.basecoatQuantity`]);
                        }}
                        disabled={isPaintProductsLoading || !selectedTopcoatId}
                      >
                        <SelectTrigger aria-label='Select basecoat product'>
                          <SelectValue placeholder={UI_TEXT.SELECT_BASECOAT_PRODUCT_PLACEHOLDER} />
                        </SelectTrigger>
                        <SelectContent>
                          {!selectedTopcoatId ? (
                            <SelectItem value={`__select_topcoat_first__${rowIndex}`} disabled>
                              {SELECT_TOPCOAT_FIRST_TEXT}
                            </SelectItem>
                          ) : basecoatOptions.length > 0 ? (
                            basecoatOptions.map(product => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.label}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value={`__no_basecoat_available__${rowIndex}`} disabled>
                              {NO_BASECOAT_AVAILABLE_TEXT}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.paintPairs?.[rowIndex]?.basecoatId ? (
                    <p className='text-xs text-destructive'>{errors.paintPairs[rowIndex]?.basecoatId?.message}</p>
                  ) : null}
                </div>

                <div className='space-y-1'>
                  <label className='text-xs font-medium text-text-muted'>Basecoat Quantity (liters)</label>
                  <Controller
                    control={control}
                    name={`paintPairs.${rowIndex}.basecoatQuantity`}
                    render={({ field }) => (
                      <Input
                        placeholder='e.g. 5 or 5.5'
                        value={field.value}
                        onChange={event => {
                          field.onChange(event);
                          clearErrors(`paintPairs.${rowIndex}.basecoatQuantity`);
                        }}
                        disabled={!selectedBasecoatId}
                      />
                    )}
                  />
                  {errors.paintPairs?.[rowIndex]?.basecoatQuantity ? (
                    <p className='text-xs text-destructive'>{errors.paintPairs[rowIndex]?.basecoatQuantity?.message}</p>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </article>
    );
  }
);
ResubmitUpdatePaintPairRow.displayName = 'ResubmitUpdatePaintPairRow';

/**
 * Renders requested paint pair rows with topcoat/basecoat product selection.
 *
 * @param props - Paint pair form adapters, options and row handlers.
 * @returns Paint pair editable section or null when not requested.
 */
export const ResubmitUpdatePaintPairsSection = ({
  requestedFieldNames,
  existingPaintPairs,
  control,
  register,
  setValue,
  clearErrors,
  errors,
  paintPairRows,
  topcoatOptions,
  isPaintProductsLoading,
  isPaintProductsError,
  paintProductsErrorMessage,
  onAddPaintPair,
  onRemovePaintPair,
}: ResubmitUpdatePaintPairsSectionProps): JSX.Element | null => {
  if (!requestedFieldNames.includes('paint_pairs')) {
    return null;
  }
  const specialistPairs = existingPaintPairs.filter(pair => pair.topcoat.productType === 'SPECIALIST');
  const topcoatPairs = existingPaintPairs.filter(pair => pair.topcoat.productType !== 'SPECIALIST');

  return (
    <section className='space-y-2 rounded-xl border border-primary/15 p-3'>
      <h3 className='text-sm font-semibold text-text-primary'>{RESUBMIT_FIELD_LABELS.paint_pairs}</h3>
      {specialistPairs.length > 0 ? (
        <div className='overflow-x-auto rounded-lg border border-primary/10 bg-white p-2'>
          <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted'>Specialized Paint</p>
          <table className='min-w-full text-sm'>
            <thead>
              <tr className='border-b border-border text-left text-text-muted'>
                <th className='py-2 pr-2'>Selection Type</th>
                <th className='py-2 pr-2'>Specialized</th>
                <th className='py-2 pr-2'>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {specialistPairs.map(pair => (
                <tr key={pair.id} className='border-b border-border/60 last:border-b-0 align-top'>
                  <td className='py-2 pr-2'>Specialized</td>
                  <td className='py-2 pr-2'>{pair.topcoat.name}</td>
                  <td className='py-2 pr-2'>{pair.topcoatQuantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {topcoatPairs.length > 0 ? (
        <div className='overflow-x-auto rounded-lg border border-primary/10 bg-white p-2'>
          <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted'>Topcoat + Basecoat</p>
          <table className='min-w-full text-sm'>
            <thead>
              <tr className='border-b border-border text-left text-text-muted'>
                <th className='py-2 pr-2'>Selection Type</th>
                <th className='py-2 pr-2'>Topcoat</th>
                <th className='py-2 pr-2'>Quantity</th>
                <th className='py-2 pr-2'>Basecoat</th>
                <th className='py-2 pr-2'>Basecoat Qty</th>
              </tr>
            </thead>
            <tbody>
              {topcoatPairs.map(pair => (
                <tr key={pair.id} className='border-b border-border/60 last:border-b-0 align-top'>
                  <td className='py-2 pr-2'>Topcoat + Basecoat</td>
                  <td className='py-2 pr-2'>{pair.topcoat.name}</td>
                  <td className='py-2 pr-2'>{pair.topcoatQuantity}</td>
                  <td className='py-2 pr-2'>{pair.basecoat?.name ?? 'N/A'}</td>
                  <td className='py-2 pr-2'>{pair.basecoatQuantity ?? 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className='pt-2'>
        <p className='text-xs font-semibold uppercase tracking-wide text-text-muted'>Add New Paint Pairs</p>
      </div>

      <div className='space-y-3'>
        {paintPairRows.map(row => (
          <ResubmitUpdatePaintPairRow
            key={row.rowId}
            row={row}
            control={control}
            register={register}
            setValue={setValue}
            clearErrors={clearErrors}
            errors={errors}
            topcoatOptions={topcoatOptions}
            isPaintProductsLoading={isPaintProductsLoading}
            isPaintProductsError={isPaintProductsError}
            paintProductsErrorMessage={paintProductsErrorMessage}
            onRemovePaintPair={onRemovePaintPair}
            isRemoveDisabled={paintPairRows.length === 1}
          />
        ))}
      </div>

      <Button
        type='button'
        variant='outline'
        className='h-8 rounded-lg border-primary/25 text-xs text-primary'
        onClick={onAddPaintPair}
      >
        Add Paint Pair
      </Button>
    </section>
  );
};
