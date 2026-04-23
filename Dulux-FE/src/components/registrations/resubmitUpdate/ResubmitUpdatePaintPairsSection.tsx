import type { JSX, MouseEvent } from 'react';

import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui';
import { Input } from '#/components/ui/Input';
import { UI_TEXT } from '#/constants';
import {
  NO_BASECOAT_AVAILABLE_TEXT,
  RESUBMIT_FIELD_LABELS,
  SELECT_TOPCOAT_FIRST_TEXT,
} from '#/constants/registrations';
import type { ResubmitUpdateFormValues } from '#/schemas/registrations';
import type { ManualRegistrationProductOption } from '#/types/manualRegistration';
import type { RegistrationRejectionField } from '#/types/registrations';
import { getProductOptionLabel } from '#/utils';

interface PaintPairField {
  id: string;
}

interface ResubmitUpdatePaintPairsSectionProps {
  requestedFieldNames: RegistrationRejectionField['fieldName'][];
  control: Control<ResubmitUpdateFormValues>;
  register: UseFormRegister<ResubmitUpdateFormValues>;
  errors: FieldErrors<ResubmitUpdateFormValues>;
  fields: PaintPairField[];
  watchedPaintPairs: ResubmitUpdateFormValues['paintPairs'];
  topcoatProducts: ManualRegistrationProductOption[];
  basecoatOptionsByTopcoatId: ReadonlyMap<string, ManualRegistrationProductOption[]>;
  isPaintProductsLoading: boolean;
  isPaintProductsError: boolean;
  paintProductsErrorMessage: string;
  onAddPaintPair: () => void;
  onRemovePaintPair: (event: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Renders requested paint pair rows with topcoat/basecoat product selection.
 *
 * @param props - Paint pair form adapters, options and row handlers.
 * @returns Paint pair editable section or null when not requested.
 */
export const ResubmitUpdatePaintPairsSection = ({
  requestedFieldNames,
  control,
  register,
  errors,
  fields,
  watchedPaintPairs,
  topcoatProducts,
  basecoatOptionsByTopcoatId,
  isPaintProductsLoading,
  isPaintProductsError,
  paintProductsErrorMessage,
  onAddPaintPair,
  onRemovePaintPair,
}: ResubmitUpdatePaintPairsSectionProps): JSX.Element | null => {
  if (!requestedFieldNames.includes('paint_pairs')) {
    return null;
  }

  return (
    <section className='space-y-2 rounded-xl border border-primary/15 p-3'>
      <h3 className='text-sm font-semibold text-text-primary'>{RESUBMIT_FIELD_LABELS.paint_pairs}</h3>
      {fields.map((field, index) => {
        const selectedTopcoatId = watchedPaintPairs[index]?.topcoatId?.trim() ?? '';
        const basecoatOptions = basecoatOptionsByTopcoatId.get(selectedTopcoatId) ?? [];

        return (
          <div key={field.id} className='grid gap-2 rounded-lg border border-primary/10 p-2 md:grid-cols-2'>
            <div>
              <label className='text-xs font-medium text-text-muted'>Topcoat</label>
              <Controller
                control={control}
                name={`paintPairs.${index}.topcoatId`}
                render={({ field: paintPairField }) => (
                  <Select
                    value={paintPairField.value}
                    onValueChange={paintPairField.onChange}
                    disabled={isPaintProductsLoading}
                  >
                    <SelectTrigger aria-label='Select topcoat product'>
                      <SelectValue placeholder={UI_TEXT.SELECT_TOPCOAT_PRODUCT_PLACEHOLDER} />
                    </SelectTrigger>
                    <SelectContent>
                      {topcoatProducts.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {getProductOptionLabel(product)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {isPaintProductsError && !isPaintProductsLoading ? (
                <p className='mt-1 text-xs text-destructive'>{paintProductsErrorMessage}</p>
              ) : null}
              {errors.paintPairs?.[index]?.topcoatId ? (
                <p className='mt-1 text-xs text-destructive'>{errors.paintPairs[index]?.topcoatId?.message}</p>
              ) : null}
            </div>

            <div>
              <label className='text-xs font-medium text-text-muted'>Topcoat Quantity</label>
              <Input {...register(`paintPairs.${index}.topcoatQuantity`)} />
              {errors.paintPairs?.[index]?.topcoatQuantity ? (
                <p className='mt-1 text-xs text-destructive'>{errors.paintPairs[index]?.topcoatQuantity?.message}</p>
              ) : null}
            </div>

            <div>
              <label className='text-xs font-medium text-text-muted'>Basecoat (Optional)</label>
              <Controller
                control={control}
                name={`paintPairs.${index}.basecoatId`}
                render={({ field: paintPairField }) => (
                  <Select
                    value={paintPairField.value}
                    onValueChange={paintPairField.onChange}
                    disabled={isPaintProductsLoading || !selectedTopcoatId}
                  >
                    <SelectTrigger aria-label='Select basecoat product'>
                      <SelectValue placeholder={UI_TEXT.SELECT_BASECOAT_PRODUCT_PLACEHOLDER} />
                    </SelectTrigger>
                    <SelectContent>
                      {!selectedTopcoatId ? (
                        <SelectItem value={`__select_topcoat_first__${index}`} disabled>
                          {SELECT_TOPCOAT_FIRST_TEXT}
                        </SelectItem>
                      ) : basecoatOptions.length > 0 ? (
                        basecoatOptions.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {getProductOptionLabel(product)}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value={`__no_basecoat_available__${index}`} disabled>
                          {NO_BASECOAT_AVAILABLE_TEXT}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.paintPairs?.[index]?.basecoatId ? (
                <p className='mt-1 text-xs text-destructive'>{errors.paintPairs[index]?.basecoatId?.message}</p>
              ) : null}
            </div>

            <div>
              <label className='text-xs font-medium text-text-muted'>Basecoat Quantity (Optional)</label>
              <Input
                {...register(`paintPairs.${index}.basecoatQuantity`)}
                disabled={!watchedPaintPairs[index]?.basecoatId}
              />
              {errors.paintPairs?.[index]?.basecoatQuantity ? (
                <p className='mt-1 text-xs text-destructive'>{errors.paintPairs[index]?.basecoatQuantity?.message}</p>
              ) : null}
            </div>

            <div className='md:col-span-2'>
              <Button
                type='button'
                variant='outline'
                className='h-8 rounded-lg border-primary/25 text-xs text-primary'
                data-index={index}
                onClick={onRemovePaintPair}
                disabled={fields.length === 1}
              >
                Remove Paint Pair
              </Button>
            </div>
          </div>
        );
      })}

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
