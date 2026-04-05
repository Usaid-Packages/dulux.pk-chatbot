/* eslint import/order: off */
import type { JSX } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '#/components/ui';
import { productFormSchema, type ProductFormSchemaValues } from '#/schemas/products';
import { productTypes, type ProductFormValues, type SurfaceType } from '#/types/products';

interface ProductFormProps {
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting: boolean;
  initialValues?: ProductFormValues;
  surfaceTypes: SurfaceType[];
  onSubmit: (values: ProductFormValues) => void;
  onCancel: () => void;
}

const DEFAULT_VALUES: ProductFormValues = {
  name: '',
  productType: 'TOPCOAT',
  warrantyYears: 1,
  coverageDetails: '',
  webpageUrl: '',
  features: '',
  isActive: true,
  surfaceTypeIds: [],
};

const PRODUCT_STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
] as const;

const getSurfaceGroup = (surfaceTypes: SurfaceType[], environment: SurfaceType['environment']): SurfaceType[] => {
  return surfaceTypes.filter(surfaceType => surfaceType.environment === environment);
};

export const ProductForm = ({
  title,
  description,
  submitLabel,
  isSubmitting,
  initialValues,
  surfaceTypes,
  onSubmit,
  onCancel,
}: ProductFormProps): JSX.Element => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormSchemaValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialValues ?? DEFAULT_VALUES,
  });

  const selectedSurfaceTypeIds = watch('surfaceTypeIds');
  const interiorSurfaceTypes = getSurfaceGroup(surfaceTypes, 'INTERIOR');
  const exteriorSurfaceTypes = getSurfaceGroup(surfaceTypes, 'EXTERIOR');

  const toggleSurfaceSelection = (surfaceTypeId: number, checked: boolean): void => {
    const selectedIds = new Set(selectedSurfaceTypeIds);

    if (checked) {
      selectedIds.add(surfaceTypeId);
    } else {
      selectedIds.delete(surfaceTypeId);
    }

    setValue('surfaceTypeIds', Array.from(selectedIds), { shouldValidate: true });
  };

  const handleFormSubmit = (values: ProductFormSchemaValues): void => {
    onSubmit(values);
  };

  return (
    <section className='wf-card wf-card-p6'>
      <header className='mb-5 space-y-1'>
        <h2 className='text-xl font-semibold text-text-primary'>{title}</h2>
        <p className='text-sm text-text-muted'>{description}</p>
      </header>

      <form className='space-y-5' onSubmit={handleSubmit(handleFormSubmit)}>
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-2'>
            <label htmlFor='product-name' className='text-sm font-medium text-text-primary'>
              Product Name
            </label>
            <Input
              id='product-name'
              placeholder='Enter product name'
              {...register('name')}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name ? <p className='text-xs text-destructive'>{errors.name.message}</p> : null}
          </div>

          <div className='space-y-2'>
            <label htmlFor='product-type' className='text-sm font-medium text-text-primary'>
              Product Type
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
                        {type === 'TOPCOAT' ? 'Topcoat' : 'Basecoat'}
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
            </label>
            <Input
              id='product-warranty'
              type='number'
              min={1}
              placeholder='Enter warranty years'
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

        <div className='space-y-2'>
          <label htmlFor='product-url' className='text-sm font-medium text-text-primary'>
            Product URL
          </label>
          <Input
            id='product-url'
            type='url'
            placeholder='https://example.com/product'
            {...register('webpageUrl')}
            aria-invalid={Boolean(errors.webpageUrl)}
          />
          {errors.webpageUrl ? <p className='text-xs text-destructive'>{errors.webpageUrl.message}</p> : null}
        </div>

        <div className='space-y-2'>
          <label htmlFor='product-coverage' className='text-sm font-medium text-text-primary'>
            Coverage Details
          </label>
          <Textarea
            id='product-coverage'
            rows={3}
            placeholder='e.g. 100 sq ft per liter on smooth plaster'
            {...register('coverageDetails')}
            aria-invalid={Boolean(errors.coverageDetails)}
          />
          {errors.coverageDetails ? <p className='text-xs text-destructive'>{errors.coverageDetails.message}</p> : null}
        </div>

        <div className='space-y-2'>
          <label htmlFor='product-features' className='text-sm font-medium text-text-primary'>
            Key Features
          </label>
          <Textarea
            id='product-features'
            rows={4}
            placeholder='Describe key features and customer value'
            {...register('features')}
            aria-invalid={Boolean(errors.features)}
          />
          {errors.features ? <p className='text-xs text-destructive'>{errors.features.message}</p> : null}
        </div>

        <fieldset className='space-y-3'>
          <legend className='text-sm font-medium text-text-primary'>Surface Mapping</legend>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='rounded-md border border-border p-3'>
              <p className='mb-2 text-sm font-semibold text-text-primary'>Interior Surfaces</p>
              <div className='space-y-2'>
                {interiorSurfaceTypes.map(surfaceType => {
                  const checked = selectedSurfaceTypeIds.includes(surfaceType.id);

                  return (
                    <label key={surfaceType.id} className='flex items-center gap-2 text-sm text-text-primary'>
                      <input
                        type='checkbox'
                        checked={checked}
                        onChange={event => toggleSurfaceSelection(surfaceType.id, event.target.checked)}
                      />
                      {surfaceType.name}
                    </label>
                  );
                })}
                {interiorSurfaceTypes.length === 0 ? (
                  <p className='text-xs text-text-muted'>No interior surface types found.</p>
                ) : null}
              </div>
            </div>

            <div className='rounded-md border border-border p-3'>
              <p className='mb-2 text-sm font-semibold text-text-primary'>Exterior Surfaces</p>
              <div className='space-y-2'>
                {exteriorSurfaceTypes.map(surfaceType => {
                  const checked = selectedSurfaceTypeIds.includes(surfaceType.id);

                  return (
                    <label key={surfaceType.id} className='flex items-center gap-2 text-sm text-text-primary'>
                      <input
                        type='checkbox'
                        checked={checked}
                        onChange={event => toggleSurfaceSelection(surfaceType.id, event.target.checked)}
                      />
                      {surfaceType.name}
                    </label>
                  );
                })}
                {exteriorSurfaceTypes.length === 0 ? (
                  <p className='text-xs text-text-muted'>No exterior surface types found.</p>
                ) : null}
              </div>
            </div>
          </div>

          {errors.surfaceTypeIds ? <p className='text-xs text-destructive'>{errors.surfaceTypeIds.message}</p> : null}
        </fieldset>

        <div className='flex items-center justify-end gap-2'>
          <Button type='button' variant='outline' onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type='submit' disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </section>
  );
};
