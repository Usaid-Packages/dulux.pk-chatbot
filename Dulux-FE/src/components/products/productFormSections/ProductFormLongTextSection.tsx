import type { JSX } from 'react';

import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { Input, Textarea } from '#/components/ui';
import { PRODUCT_FORM_MAX_LENGTHS } from '#/constants';
import type { ProductFormSchemaValues } from '#/schemas/products';

interface ProductFormLongTextSectionProps {
  register: UseFormRegister<ProductFormSchemaValues>;
  errors: FieldErrors<ProductFormSchemaValues>;
  useSplitLongFieldLayout: boolean;
}

/**
 * ProductFormLongTextSection renders URL, coverage, and feature text fields.
 *
 * @param props - Form bindings, validation errors, and layout toggle for long fields.
 * @returns Long-text fields for product details.
 */
export const ProductFormLongTextSection = ({
  register,
  errors,
  useSplitLongFieldLayout,
}: ProductFormLongTextSectionProps): JSX.Element => {
  return (
    <>
      <div className='space-y-2'>
        <label htmlFor='product-url' className='text-sm font-medium text-text-primary'>
          Product URL <span className='text-destructive'>*</span>
        </label>
        <Input
          id='product-url'
          type='url'
          className='rounded-xl border-primary/20 bg-white'
          placeholder='https://example.com/product'
          {...register('webpageUrl')}
          aria-invalid={Boolean(errors.webpageUrl)}
        />
        {errors.webpageUrl ? <p className='text-xs text-destructive'>{errors.webpageUrl.message}</p> : null}
      </div>

      <div className={useSplitLongFieldLayout ? 'grid gap-4 lg:grid-cols-2' : 'space-y-5'}>
        <div className='space-y-2'>
          <label htmlFor='product-coverage' className='text-sm font-medium text-text-primary'>
            Coverage Details <span className='text-destructive'>*</span>
          </label>
          <Textarea
            id='product-coverage'
            rows={3}
            className='rounded-xl border-primary/20 bg-white'
            placeholder='e.g. 100 sq ft per liter on smooth plaster'
            maxLength={PRODUCT_FORM_MAX_LENGTHS.coverageDetails}
            {...register('coverageDetails')}
            aria-invalid={Boolean(errors.coverageDetails)}
          />
          {errors.coverageDetails ? <p className='text-xs text-destructive'>{errors.coverageDetails.message}</p> : null}
        </div>

        <div className='space-y-2'>
          <label htmlFor='product-features' className='text-sm font-medium text-text-primary'>
            Key Features <span className='text-destructive'>*</span>
          </label>
          <Textarea
            id='product-features'
            rows={4}
            className='rounded-xl border-primary/20 bg-white'
            placeholder='Describe key features and customer value'
            maxLength={PRODUCT_FORM_MAX_LENGTHS.features}
            {...register('features')}
            aria-invalid={Boolean(errors.features)}
          />
          {errors.features ? <p className='text-xs text-destructive'>{errors.features.message}</p> : null}
        </div>
      </div>
    </>
  );
};
