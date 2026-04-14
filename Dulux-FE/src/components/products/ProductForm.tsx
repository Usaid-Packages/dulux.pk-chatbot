import type { ChangeEvent, JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronDown } from 'lucide-react';
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
import {
  PRODUCT_FORM_MAX_LENGTHS,
  PRODUCT_IMAGE_ALLOWED_FILE_TYPES,
  PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES,
  PRODUCT_STATUS_OPTIONS,
} from '#/constants';
import { productFormSchema, type ProductFormSchemaValues } from '#/schemas/products';
import { productTypes } from '#/types/products';
import type {
  LinkedBasecoat,
  ProductFormSubmission,
  ProductFormValues,
  ProductImage,
  SurfaceType,
} from '#/types/products';

interface ProductFormProps {
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting: boolean;
  useSplitLongFieldLayout?: boolean;
  defaultBasecoatWarrantyYears?: number;
  initialValues?: ProductFormValues;
  initialImages?: ProductImage[];
  surfaceTypes: SurfaceType[];
  basecoatOptions: LinkedBasecoat[];
  onSubmit: (submission: ProductFormSubmission) => void;
  onRemoveImage?: (imageId: string) => void;
  isImageActionPending?: boolean;
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

const getSurfaceGroup = (surfaceTypes: SurfaceType[], environment: SurfaceType['environment']): SurfaceType[] => {
  return surfaceTypes.filter(surfaceType => surfaceType.environment === environment);
};

interface MultiSelectDropdownOption {
  id: number;
  label: string;
  meta?: string;
}

interface MultiSelectDropdownProps {
  label: string;
  dropdownId: string;
  isOpen: boolean;
  selectedCount: number;
  searchValue: string;
  searchPlaceholder: string;
  emptyMessage: string;
  options: MultiSelectDropdownOption[];
  selectedIds: number[];
  onToggle: () => void;
  onSearchChange: (value: string) => void;
  onToggleOption: (optionId: number, checked: boolean) => void;
}

const MultiSelectDropdown = ({
  label,
  dropdownId,
  isOpen,
  selectedCount,
  searchValue,
  searchPlaceholder,
  emptyMessage,
  options,
  selectedIds,
  onToggle,
  onSearchChange,
  onToggleOption,
}: MultiSelectDropdownProps): JSX.Element => {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onSearchChange(event.target.value);
  };

  const createCheckboxHandler = (optionId: number, isSelected: boolean) => (): void => {
    onToggleOption(optionId, !isSelected);
  };

  return (
    <div className='rounded-xl border border-primary/20 bg-white/85 p-3'>
      <button
        type='button'
        className='flex w-full items-center justify-between rounded-lg text-sm font-semibold text-text-primary'
        aria-expanded={isOpen}
        aria-controls={dropdownId}
        onClick={onToggle}
      >
        <span>
          {label} ({selectedCount})
        </span>
        <ChevronDown
          className={['h-4 w-4 text-text-muted transition-transform duration-200', isOpen ? 'rotate-180' : ''].join(
            ' '
          )}
        />
      </button>
      {isOpen ? (
        <div id={dropdownId} className='mt-3 space-y-3'>
          <Input
            type='search'
            value={searchValue}
            onChange={handleSearchChange}
            className='rounded-xl border-primary/20 bg-white'
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          <div className='max-h-34 space-y-2 overflow-y-auto pr-1'>
            {options.map(option => {
              const isSelected = selectedIds.includes(option.id);

              return (
                <button
                  key={option.id}
                  type='button'
                  className={[
                    'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    isSelected
                      ? 'border-primary/35 bg-primary/10 text-text-primary'
                      : 'border-primary/15 bg-white text-text-primary hover:border-primary/30 hover:bg-primary/5',
                  ].join(' ')}
                  onClick={createCheckboxHandler(option.id, isSelected)}
                  aria-pressed={isSelected}
                >
                  <span className='flex min-w-0 items-center gap-2'>
                    <span className='truncate font-medium'>{option.label}</span>
                    {option.meta ? <span className='shrink-0 text-xs text-text-muted'>{option.meta}</span> : null}
                  </span>
                  <span
                    className={[
                      'inline-flex h-5 w-5 items-center justify-center rounded-full border',
                      isSelected
                        ? 'border-primary bg-primary text-white'
                        : 'border-primary/20 bg-white text-transparent',
                    ].join(' ')}
                  >
                    <Check className='h-3 w-3' aria-hidden='true' />
                  </span>
                </button>
              );
            })}
            {options.length === 0 ? <p className='text-xs text-text-muted'>{emptyMessage}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const ProductForm = ({
  title,
  description,
  submitLabel,
  isSubmitting,
  useSplitLongFieldLayout = false,
  defaultBasecoatWarrantyYears,
  initialValues,
  initialImages = [],
  surfaceTypes,
  basecoatOptions,
  onSubmit,
  onRemoveImage,
  isImageActionPending = false,
  onCancel,
}: ProductFormProps): JSX.Element => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, dirtyFields },
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
  const [activeDropdown, setActiveDropdown] = useState<'interior' | 'exterior' | 'basecoat' | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageValidationError, setImageValidationError] = useState<string | null>(null);
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

  useEffect(() => {
    if (selectedProductType !== 'BASECOAT') {
      return;
    }

    if (defaultBasecoatWarrantyYears === undefined || dirtyFields.warrantyYears) {
      return;
    }

    const currentWarrantyYears = Number(getValues('warrantyYears'));
    if (currentWarrantyYears === defaultBasecoatWarrantyYears) {
      return;
    }

    setValue('warrantyYears', defaultBasecoatWarrantyYears, { shouldValidate: true });
  }, [defaultBasecoatWarrantyYears, dirtyFields.warrantyYears, getValues, selectedProductType, setValue]);

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
    onSubmit({
      values,
      imageFile: selectedImageFile,
    });
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

  const interiorSelectedCount = selectedSurfaceTypeIds.filter(id =>
    interiorSurfaceTypes.some(item => item.id === id)
  ).length;
  const exteriorSelectedCount = selectedSurfaceTypeIds.filter(id =>
    exteriorSurfaceTypes.some(item => item.id === id)
  ).length;

  const interiorDropdownOptions: MultiSelectDropdownOption[] = filteredInteriorSurfaceTypes.map(surfaceType => ({
    id: surfaceType.id,
    label: surfaceType.name,
  }));

  const exteriorDropdownOptions: MultiSelectDropdownOption[] = filteredExteriorSurfaceTypes.map(surfaceType => ({
    id: surfaceType.id,
    label: surfaceType.name,
  }));

  const basecoatDropdownOptions: MultiSelectDropdownOption[] = filteredBasecoatOptions.map(basecoat => ({
    id: basecoat.id,
    label: basecoat.name,
    meta: `${basecoat.warrantyYears} years`,
  }));

  const toggleDropdown = (dropdown: 'interior' | 'exterior' | 'basecoat'): void => {
    setActiveDropdown(previous => (previous === dropdown ? null : dropdown));
  };

  const handleImageFilesChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const fileList = event.currentTarget.files;
    if (!fileList || fileList.length === 0) {
      setSelectedImageFile(null);
      setImageValidationError(null);
      return;
    }

    if (initialImages.length > 0) {
      setSelectedImageFile(null);
      setImageValidationError('Remove the current image before uploading a new one.');
      return;
    }

    if (fileList.length > 1) {
      setSelectedImageFile(null);
      setImageValidationError('Only one image can be uploaded per product.');
      return;
    }

    const selectedFile = fileList[0];
    const isValidType = PRODUCT_IMAGE_ALLOWED_FILE_TYPES.includes(
      selectedFile.type as (typeof PRODUCT_IMAGE_ALLOWED_FILE_TYPES)[number]
    );

    if (!isValidType) {
      setSelectedImageFile(null);
      setImageValidationError('Only JPG, PNG, and WEBP images are allowed.');
      return;
    }

    if (selectedFile.size > PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES) {
      setSelectedImageFile(null);
      setImageValidationError('The image must be 5MB or smaller.');
      return;
    }

    setSelectedImageFile(selectedFile);
    setImageValidationError(null);
  };

  const handleRemoveCurrentImage = (imageId: number): void => {
    onRemoveImage?.(String(imageId));
  };

  return (
    <section className='wf-card wf-card-p6 border-primary/15 bg-white'>
      <header className='mb-5 space-y-1'>
        <p className='text-xs font-semibold uppercase tracking-[2px] text-primary'>Product Editor</p>
        <h2 className='text-xl font-extrabold tracking-tight text-text-primary'>{title}</h2>
        <p className='text-sm text-text-muted'>{description}</p>
      </header>

      <form className='space-y-5' onSubmit={handleSubmit(handleFormSubmit)}>
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
              {selectedProductType === 'TOPCOAT' ? <span className='text-destructive'>*</span> : null}
            </label>
            <Input
              id='product-warranty'
              type='number'
              min={0}
              className='rounded-xl border-primary/20 bg-white'
              placeholder={
                selectedProductType === 'TOPCOAT' ? 'Enter warranty years' : 'Optional for basecoat products'
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
            {errors.coverageDetails ? (
              <p className='text-xs text-destructive'>{errors.coverageDetails.message}</p>
            ) : null}
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

        <div className='space-y-3 rounded-xl border border-primary/20 bg-white/85 p-4'>
          <div>
            <p className='text-sm font-medium text-text-primary'>
              Product Images <span className='text-destructive'>*</span>
            </p>
            <p className='text-xs text-text-muted'>Upload one product image (JPG, PNG, WEBP. Max 5MB).</p>
          </div>
          <Input
            type='file'
            accept='image/jpeg,image/png,image/webp'
            className='rounded-xl border-primary/20 bg-white file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-primary'
            disabled={initialImages.length > 0 || isImageActionPending}
            onChange={handleImageFilesChange}
          />
          {selectedImageFile ? (
            <p className='text-xs text-text-muted'>Selected image: {selectedImageFile.name}</p>
          ) : null}
          {imageValidationError ? <p className='text-xs text-destructive'>{imageValidationError}</p> : null}
          {initialImages.length > 0 ? (
            <div className='space-y-2'>
              <p className='text-xs font-medium uppercase tracking-[1.2px] text-text-muted'>Current Image</p>
              <p className='text-xs text-text-muted'>Remove the current image before uploading a replacement.</p>
              <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                {initialImages.map(productImage => {
                  const imageUrl = productImage.image.url || productImage.image.image;
                  return (
                    <div key={productImage.id} className='space-y-2 rounded-lg border border-primary/15 bg-white p-2'>
                      <img
                        src={imageUrl}
                        alt='Current product preview'
                        className='h-24 w-full rounded-md border border-primary/10 object-cover'
                      />
                      {onRemoveImage ? (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='w-full'
                          disabled={isImageActionPending}
                          onClick={() => handleRemoveCurrentImage(productImage.id)}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <fieldset className='space-y-3'>
          <legend className='text-sm font-medium text-text-primary'>
            Surface Mapping <span className='text-destructive'>*</span>
          </legend>

          <div className='space-y-4'>
            <MultiSelectDropdown
              label='Interior Surfaces'
              dropdownId='interior-surfaces-dropdown'
              isOpen={activeDropdown === 'interior'}
              selectedCount={interiorSelectedCount}
              searchValue={interiorSurfaceSearch}
              searchPlaceholder='Search more interior surfaces...'
              emptyMessage='No interior surfaces match this search.'
              options={interiorDropdownOptions}
              selectedIds={selectedSurfaceTypeIds}
              onToggle={() => toggleDropdown('interior')}
              onSearchChange={setInteriorSurfaceSearch}
              onToggleOption={toggleSurfaceSelection}
            />

            <MultiSelectDropdown
              label='Exterior Surfaces'
              dropdownId='exterior-surfaces-dropdown'
              isOpen={activeDropdown === 'exterior'}
              selectedCount={exteriorSelectedCount}
              searchValue={exteriorSurfaceSearch}
              searchPlaceholder='Search more exterior surfaces...'
              emptyMessage='No exterior surfaces match this search.'
              options={exteriorDropdownOptions}
              selectedIds={selectedSurfaceTypeIds}
              onToggle={() => toggleDropdown('exterior')}
              onSearchChange={setExteriorSurfaceSearch}
              onToggleOption={toggleSurfaceSelection}
            />
          </div>

          {errors.surfaceTypeIds ? <p className='text-xs text-destructive'>{errors.surfaceTypeIds.message}</p> : null}
        </fieldset>

        {selectedProductType === 'TOPCOAT' ? (
          <fieldset className='space-y-3'>
            <legend className='text-sm font-medium text-text-primary'>Linked Basecoats</legend>
            <MultiSelectDropdown
              label='Linked Basecoats'
              dropdownId='linked-basecoats-dropdown'
              isOpen={activeDropdown === 'basecoat'}
              selectedCount={selectedBasecoatIds.length}
              searchValue={linkedBasecoatSearch}
              searchPlaceholder='Search more linked basecoats...'
              emptyMessage='No basecoat products match this search.'
              options={basecoatDropdownOptions}
              selectedIds={selectedBasecoatIds}
              onToggle={() => toggleDropdown('basecoat')}
              onSearchChange={setLinkedBasecoatSearch}
              onToggleOption={toggleBasecoatSelection}
            />
            {errors.basecoatIds ? <p className='text-xs text-destructive'>{errors.basecoatIds.message}</p> : null}
          </fieldset>
        ) : null}

        <div className='flex items-center justify-end gap-2'>
          <Button type='button' variant='outline' onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type='submit'
            className='rounded-xl bg-[linear-gradient(135deg,#1966c8_0%,#2f8deb_100%)] text-white hover:brightness-105'
            disabled={isSubmitting || Boolean(imageValidationError)}
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </section>
  );
};
