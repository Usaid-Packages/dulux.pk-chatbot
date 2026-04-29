import type { JSX } from 'react';

import { Controller } from 'react-hook-form';
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';

import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui';
import { PRODUCT_STATUS_OPTIONS } from '#/constants';
import type { ProductFormSchemaValues } from '#/schemas/products';
import { PRODUCT_TYPES, productTypes } from '#/types/products';

interface ProductFormCoreFieldsSectionProps {
  register: UseFormRegister<ProductFormSchemaValues>;
  control: Control<ProductFormSchemaValues>;
  errors: FieldErrors<ProductFormSchemaValues>;
  selectedProductType: ProductFormSchemaValues['productType'];
}

/**
 * ProductFormCoreFieldsSection renders core product identity and status fields.
 *
 * @param props - Form bindings and selected product type for contextual warranty hints.
 * @returns Core form fields grid.
 */
export const ProductFormCoreFieldsSection = ({
  register,
  control,
  errors,
  selectedProductType,
}: ProductFormCoreFieldsSectionProps): JSX.Element => {
  return (
    <div className='grid gap-4 md:grid-cols-2'>
      <div className='space-y-2'>
        <label htmlFor='product-name' className='text-sm font-medium text-text-primary'>
          Product Name <span className='text-destructive'>*</span>
        </label>
        <Input
          id='product-name'
          className='rounded-xl border-primary/20 bg-white'
          placeholder='Enter product name'
          {...register('name')}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name ? <p className='text-xs text-destructive'>{errors.name.message}</p> : null}
      </div>

      <div className='space-y-2'>
        <label htmlFor='product-type' className='text-sm font-medium text-text-primary'>
          Product Type <span className='text-destructive'>*</span>
        </label>
        <Controller
          control={control}
          name='productType'
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id='product-type'>
                <SelectValue placeholder='Select product type' />
              </SelectTrigger>
              <SelectContent>
                {productTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {getProductTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.productType ? <p className='text-xs text-destructive'>{errors.productType.message}</p> : null}
      </div>

      <div className='space-y-2'>
        <label htmlFor='product-warranty' className='text-sm font-medium text-text-primary'>
          Warranty (Years)
          {selectedProductType === PRODUCT_TYPES.TOPCOAT ? <span className='text-destructive'>*</span> : null}
        </label>
        <Input
          id='product-warranty'
          type='number'
          min={0}
          className='rounded-xl border-primary/20 bg-white'
          placeholder={
            selectedProductType === PRODUCT_TYPES.TOPCOAT
              ? 'Enter warranty years'
              : 'Optional for basecoat and specialist products'
          }
          {...register('warrantyYears')}
          aria-invalid={Boolean(errors.warrantyYears)}
        />
        {errors.warrantyYears ? <p className='text-xs text-destructive'>{errors.warrantyYears.message}</p> : null}
      </div>

      <div className='space-y-2'>
        <label htmlFor='product-status' className='text-sm font-medium text-text-primary'>
          Status
        </label>
        <Controller
          control={control}
          name='isActive'
          render={({ field }) => (
            <Select
              value={field.value ? 'active' : 'inactive'}
              onValueChange={value => field.onChange(value === 'active')}
            >
              <SelectTrigger id='product-status'>
                <SelectValue placeholder='Select status' />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </div>
  );
};
const getProductTypeLabel = (type: (typeof productTypes)[number]): string => {
  if (type === PRODUCT_TYPES.TOPCOAT) {
    return 'Topcoat';
  }

  if (type === PRODUCT_TYPES.SPECIALIST) {
    return 'Specialist';
  }

  return 'Basecoat';
};
