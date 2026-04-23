import type { JSX } from 'react';

import { Controller } from 'react-hook-form';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui';
import { UI_TEXT } from '#/constants';
import type { AddClaimSectionFormProps, ClaimBasecoatOptions, ClaimSelectOption } from '#/types/claims.form.types';

interface AddClaimProductsSectionProps extends AddClaimSectionFormProps {
  basecoatOptions: ClaimBasecoatOptions;
  hasTopcoatSelection: boolean;
  isBasecoatSelectDisabled: boolean;
  isNoBasecoatFlow: boolean;
  isRegistrationSelected: boolean;
  isRegistrationDetailLoading: boolean;
  isTopcoatSelectDisabled: boolean;
  noBasecoatOptionValue: string;
  selectedPaintPairId: string;
  topcoatOptions: ClaimSelectOption[];
  topcoatProductId: string;
  registrationId: string;
  onTopcoatChange: (value: string) => void;
}

/**
 * AddClaimProductsSection renders topcoat/basecoat selectors and paint-pair resolution status.
 */
export const AddClaimProductsSection = ({
  basecoatOptions,
  control,
  errors,
  hasTopcoatSelection,
  isBasecoatSelectDisabled,
  isNoBasecoatFlow,
  isRegistrationDetailLoading,
  isRegistrationSelected,
  isTopcoatSelectDisabled,
  noBasecoatOptionValue,
  onTopcoatChange,
  registrationId,
  selectedPaintPairId,
  topcoatOptions,
  topcoatProductId,
}: AddClaimProductsSectionProps): JSX.Element => {
  return (
    <>
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='space-y-2'>
          <label htmlFor='claim-topcoat' className='text-sm font-medium text-text-primary'>
            Topcoat Product <span className='text-destructive'>*</span>
          </label>
          <Controller
            control={control}
            name='topcoatProductId'
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={value => {
                  field.onChange(value);
                  onTopcoatChange(value);
                }}
              >
                <SelectTrigger id='claim-topcoat' disabled={isTopcoatSelectDisabled}>
                  <SelectValue
                    placeholder={
                      isRegistrationSelected
                        ? isRegistrationDetailLoading
                          ? 'Loading topcoats...'
                          : 'Select topcoat'
                        : 'Select registration first'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {topcoatOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.topcoatProductId ? (
            <p className='text-xs text-destructive'>{errors.topcoatProductId.message}</p>
          ) : null}
          {!isRegistrationSelected ? (
            <p className='text-xs text-text-muted'>Select approved registration first to load topcoat options.</p>
          ) : null}
          {isRegistrationSelected && !isRegistrationDetailLoading && topcoatOptions.length === 0 ? (
            <p className='text-xs text-text-muted'>No topcoat is available for the selected registration.</p>
          ) : null}
        </div>

        <div className='space-y-2'>
          <label htmlFor='claim-basecoat' className='text-sm font-medium text-text-primary'>
            Basecoat Product
          </label>
          <Controller
            control={control}
            name='basecoatProductId'
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id='claim-basecoat' disabled={isBasecoatSelectDisabled}>
                  <SelectValue
                    placeholder={
                      hasTopcoatSelection
                        ? isRegistrationDetailLoading
                          ? 'Loading basecoats...'
                          : 'Select basecoat'
                        : UI_TEXT.SELECT_TOPCOAT_FIRST
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {basecoatOptions.hasNoBasecoat ? (
                    <SelectItem value={noBasecoatOptionValue}>No basecoat</SelectItem>
                  ) : null}
                  {basecoatOptions.items.map(option => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.basecoatProductId ? (
            <p className='text-xs text-destructive'>{errors.basecoatProductId.message}</p>
          ) : null}
          {!hasTopcoatSelection ? (
            <p className='text-xs text-text-muted'>{UI_TEXT.SELECT_TOPCOAT_FIRST_TO_ENABLE_BASECOAT}</p>
          ) : null}
          {isNoBasecoatFlow ? (
            <p className='text-xs text-text-muted'>No related basecoat found for the selected topcoat.</p>
          ) : null}
        </div>
      </div>

      {registrationId && topcoatProductId ? (
        <p className={selectedPaintPairId ? 'text-xs text-text-muted' : 'text-xs text-destructive'}>
          {selectedPaintPairId
            ? 'Matching registration paint pair found.'
            : 'No matching paint pair found for selected registration + topcoat/basecoat.'}
        </p>
      ) : null}
      {errors.paintPairId ? <p className='text-xs text-destructive'>{errors.paintPairId.message}</p> : null}
    </>
  );
};
