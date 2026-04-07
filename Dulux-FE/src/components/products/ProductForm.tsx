import type { ChangeEvent, JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';

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
import { productTypes, type LinkedBasecoat, type ProductFormValues, type SurfaceType } from '#/types/products';

interface ProductFormProps {
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting: boolean;
  initialValues?: ProductFormValues;
  surfaceTypes: SurfaceType[];
  basecoatOptions: LinkedBasecoat[];
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
  basecoatIds: [],
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
  basecoatOptions,
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

  const selectedProductType = watch('productType');
  const selectedSurfaceTypeIds = watch('surfaceTypeIds');
  const selectedBasecoatIds = watch('basecoatIds');
  const [interiorSurfaceSearch, setInteriorSurfaceSearch] = useState<string>('');
  const [exteriorSurfaceSearch, setExteriorSurfaceSearch] = useState<string>('');
  const [linkedBasecoatSearch, setLinkedBasecoatSearch] = useState<string>('');
  const interiorSurfaceTypes = getSurfaceGroup(surfaceTypes, 'INTERIOR');
  const exteriorSurfaceTypes = getSurfaceGroup(surfaceTypes, 'EXTERIOR');
  const normalizedInteriorSearch = interiorSurfaceSearch.trim().toLowerCase();
  const normalizedExteriorSearch = exteriorSurfaceSearch.trim().toLowerCase();
  const normalizedBasecoatSearch = linkedBasecoatSearch.trim().toLowerCase();

  const filteredInteriorSurfaceTypes = useMemo(() => {
    if (!normalizedInteriorSearch) {
      return interiorSurfaceTypes;
    }

    return interiorSurfaceTypes.filter(surfaceType =>
      surfaceType.name.toLowerCase().includes(normalizedInteriorSearch)
    );
  }, [interiorSurfaceTypes, normalizedInteriorSearch]);

  const filteredExteriorSurfaceTypes = useMemo(() => {
    if (!normalizedExteriorSearch) {
      return exteriorSurfaceTypes;
    }

    return exteriorSurfaceTypes.filter(surfaceType =>
      surfaceType.name.toLowerCase().includes(normalizedExteriorSearch)
    );
  }, [exteriorSurfaceTypes, normalizedExteriorSearch]);

  const filteredBasecoatOptions = useMemo(() => {
    if (!normalizedBasecoatSearch) {
      return basecoatOptions;
    }

    return basecoatOptions.filter(basecoat => basecoat.name.toLowerCase().includes(normalizedBasecoatSearch));
  }, [basecoatOptions, normalizedBasecoatSearch]);

  useEffect(() => {
    if (selectedProductType !== 'TOPCOAT' && selectedBasecoatIds.length > 0) {
      setValue('basecoatIds', [], { shouldValidate: true });
    }
  }, [selectedBasecoatIds, selectedProductType, setValue]);

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

  const toggleBasecoatSelection = (basecoatId: number, checked: boolean): void => {
    const selectedIds = new Set(selectedBasecoatIds);

    if (checked) {
      selectedIds.add(basecoatId);
    } else {
      selectedIds.delete(basecoatId);
    }

    setValue('basecoatIds', Array.from(selectedIds), { shouldValidate: true });
  };

  const createSurfaceCheckboxChangeHandler =
    (surfaceTypeId: number) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      toggleSurfaceSelection(surfaceTypeId, event.target.checked);
    };

  const createBasecoatCheckboxChangeHandler =
    (basecoatId: number) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      toggleBasecoatSelection(basecoatId, event.target.checked);
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
            <details className='rounded-md border border-border bg-surface-subtle p-3'>
              <summary className='cursor-pointer list-none text-sm font-semibold text-text-primary'>
                Interior Surfaces (
                {selectedSurfaceTypeIds.filter(id => interiorSurfaceTypes.some(item => item.id === id)).length})
              </summary>
              <div className='mt-3 space-y-3'>
                <Input
                  type='search'
                  value={interiorSurfaceSearch}
                  onChange={event => setInteriorSurfaceSearch(event.target.value)}
                  placeholder='Search interior surfaces...'
                  aria-label='Search interior surfaces'
                />
                <div className='max-h-56 space-y-2 overflow-y-auto pr-1'>
                  {filteredInteriorSurfaceTypes.map(surfaceType => {
                    const checked = selectedSurfaceTypeIds.includes(surfaceType.id);

                    return (
                      <label key={surfaceType.id} className='flex items-center gap-2 text-sm text-text-primary'>
                        <input
                          type='checkbox'
                          checked={checked}
                          onChange={createSurfaceCheckboxChangeHandler(surfaceType.id)}
                        />
                        {surfaceType.name}
                      </label>
                    );
                  })}
                  {filteredInteriorSurfaceTypes.length === 0 ? (
                    <p className='text-xs text-text-muted'>No interior surfaces match this search.</p>
                  ) : null}
                </div>
              </div>
            </details>

            <details className='rounded-md border border-border bg-surface-subtle p-3'>
              <summary className='cursor-pointer list-none text-sm font-semibold text-text-primary'>
                Exterior Surfaces (
                {selectedSurfaceTypeIds.filter(id => exteriorSurfaceTypes.some(item => item.id === id)).length})
              </summary>
              <div className='mt-3 space-y-3'>
                <Input
                  type='search'
                  value={exteriorSurfaceSearch}
                  onChange={event => setExteriorSurfaceSearch(event.target.value)}
                  placeholder='Search exterior surfaces...'
                  aria-label='Search exterior surfaces'
                />
                <div className='max-h-56 space-y-2 overflow-y-auto pr-1'>
                  {filteredExteriorSurfaceTypes.map(surfaceType => {
                    const checked = selectedSurfaceTypeIds.includes(surfaceType.id);

                    return (
                      <label key={surfaceType.id} className='flex items-center gap-2 text-sm text-text-primary'>
                        <input
                          type='checkbox'
                          checked={checked}
                          onChange={createSurfaceCheckboxChangeHandler(surfaceType.id)}
                        />
                        {surfaceType.name}
                      </label>
                    );
                  })}
                  {filteredExteriorSurfaceTypes.length === 0 ? (
                    <p className='text-xs text-text-muted'>No exterior surfaces match this search.</p>
                  ) : null}
                </div>
              </div>
            </details>
          </div>

          {errors.surfaceTypeIds ? <p className='text-xs text-destructive'>{errors.surfaceTypeIds.message}</p> : null}
        </fieldset>

        {selectedProductType === 'TOPCOAT' ? (
          <fieldset className='space-y-3'>
            <legend className='text-sm font-medium text-text-primary'>Linked Basecoats</legend>
            <details className='rounded-md border border-border bg-surface-subtle p-3' open>
              <summary className='cursor-pointer list-none text-sm font-semibold text-text-primary'>
                Linked Basecoats ({selectedBasecoatIds.length})
              </summary>
              <div className='mt-3 space-y-3'>
                <Input
                  type='search'
                  value={linkedBasecoatSearch}
                  onChange={event => setLinkedBasecoatSearch(event.target.value)}
                  placeholder='Search linked basecoats...'
                  aria-label='Search linked basecoats'
                />
                <div className='max-h-56 space-y-2 overflow-y-auto pr-1'>
                  {filteredBasecoatOptions.map(basecoat => {
                    const checked = selectedBasecoatIds.includes(basecoat.id);

                    return (
                      <label key={basecoat.id} className='flex items-center gap-2 text-sm text-text-primary'>
                        <input
                          type='checkbox'
                          checked={checked}
                          onChange={createBasecoatCheckboxChangeHandler(basecoat.id)}
                        />
                        <span className='font-medium'>{basecoat.name}</span>
                        <span className='text-xs text-text-muted'>{basecoat.warrantyYears} years</span>
                      </label>
                    );
                  })}
                  {filteredBasecoatOptions.length === 0 ? (
                    <p className='text-xs text-text-muted'>No basecoat products match this search.</p>
                  ) : null}
                </div>
              </div>
            </details>
            {errors.basecoatIds ? <p className='text-xs text-destructive'>{errors.basecoatIds.message}</p> : null}
          </fieldset>
        ) : null}

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
