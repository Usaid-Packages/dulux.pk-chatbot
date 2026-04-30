import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { Control, FieldErrors, UseFormHandleSubmit, UseFormRegister } from 'react-hook-form';

import { PRODUCT_IMAGE_ALLOWED_FILE_TYPES, PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES } from '#/constants';
import { useDebouncedValue } from '#/hooks';
import { productFormSchema, type ProductFormSchemaValues } from '#/schemas/products';
import { PRODUCT_TYPES } from '#/types/products';
import type {
  LinkedBasecoat,
  ProductFormSubmission,
  ProductFormValues,
  ProductImage,
  SurfaceType,
} from '#/types/products';

interface ProductFormDropdownOption {
  id: number;
  label: string;
  meta?: string;
}

type ProductFormDropdown = 'interior' | 'exterior' | 'basecoat';

interface UseProductFormAdapterParams {
  defaultBasecoatWarrantyYears?: number;
  initialImages: ProductImage[];
  initialValues?: ProductFormValues;
  surfaceTypes: SurfaceType[];
  basecoatOptions: LinkedBasecoat[];
  onSubmit: (submission: ProductFormSubmission) => void;
  onRemoveImage?: (imageId: string) => void;
}

interface UseProductFormAdapterResult {
  register: UseFormRegister<ProductFormSchemaValues>;
  control: Control<ProductFormSchemaValues>;
  handleSubmit: UseFormHandleSubmit<ProductFormSchemaValues, ProductFormSchemaValues>;
  errors: FieldErrors<ProductFormSchemaValues>;
  selectedProductType: ProductFormSchemaValues['productType'];
  selectedSurfaceTypeIds: number[];
  selectedBasecoatIds: number[];
  interiorSurfaceSearch: string;
  exteriorSurfaceSearch: string;
  linkedBasecoatSearch: string;
  activeDropdown: ProductFormDropdown | null;
  selectedImageFile: File | null;
  imageValidationError: string | null;
  interiorSelectedCount: number;
  exteriorSelectedCount: number;
  interiorDropdownOptions: ProductFormDropdownOption[];
  exteriorDropdownOptions: ProductFormDropdownOption[];
  basecoatDropdownOptions: ProductFormDropdownOption[];
  setInteriorSurfaceSearch: (value: string) => void;
  setExteriorSurfaceSearch: (value: string) => void;
  setLinkedBasecoatSearch: (value: string) => void;
  toggleDropdown: (dropdown: ProductFormDropdown) => void;
  toggleSurfaceSelection: (surfaceTypeId: number, checked: boolean) => void;
  toggleBasecoatSelection: (basecoatId: number, checked: boolean) => void;
  handleImageFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleRemoveCurrentImage: (imageId: number) => void;
  handleFormSubmit: (values: ProductFormSchemaValues) => void;
}

const DEFAULT_VALUES: ProductFormValues = {
  name: '',
  productType: PRODUCT_TYPES.TOPCOAT,
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

/**
 * useProductFormAdapter centralizes ProductForm state orchestration and derived view models.
 *
 * @param params - Product form inputs and submit/remove callbacks.
 * @returns Form bindings, derived dropdown state, and event handlers for ProductForm sections.
 */
export const useProductFormAdapter = ({
  defaultBasecoatWarrantyYears,
  initialImages,
  initialValues,
  surfaceTypes,
  basecoatOptions,
  onSubmit,
  onRemoveImage,
}: UseProductFormAdapterParams): UseProductFormAdapterResult => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
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
  const debouncedInteriorSurfaceSearch = useDebouncedValue(interiorSurfaceSearch);
  const debouncedExteriorSurfaceSearch = useDebouncedValue(exteriorSurfaceSearch);
  const debouncedLinkedBasecoatSearch = useDebouncedValue(linkedBasecoatSearch);
  const [activeDropdown, setActiveDropdown] = useState<ProductFormDropdown | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageValidationError, setImageValidationError] = useState<string | null>(null);

  const interiorSurfaceTypes = getSurfaceGroup(surfaceTypes, 'INTERIOR');
  const exteriorSurfaceTypes = getSurfaceGroup(surfaceTypes, 'EXTERIOR');
  const normalizedInteriorSearch = debouncedInteriorSurfaceSearch.trim().toLowerCase();
  const normalizedExteriorSearch = debouncedExteriorSurfaceSearch.trim().toLowerCase();
  const normalizedBasecoatSearch = debouncedLinkedBasecoatSearch.trim().toLowerCase();

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
    if (selectedProductType !== PRODUCT_TYPES.TOPCOAT && selectedBasecoatIds.length > 0) {
      setValue('basecoatIds', [], { shouldValidate: true });
    }
  }, [selectedBasecoatIds, selectedProductType, setValue]);

  useEffect(() => {
    if (selectedProductType === PRODUCT_TYPES.TOPCOAT) {
      return;
    }

    const fallbackWarrantyYears = defaultBasecoatWarrantyYears ?? 0;
    const currentWarrantyYears = getValues('warrantyYears');
    const normalizedWarrantyYears =
      typeof currentWarrantyYears === 'number'
        ? currentWarrantyYears
        : Number.parseInt(String(currentWarrantyYears ?? ''), 10);

    if (Number.isFinite(normalizedWarrantyYears) && normalizedWarrantyYears >= 0) {
      return;
    }

    setValue('warrantyYears', fallbackWarrantyYears, { shouldValidate: true });
  }, [defaultBasecoatWarrantyYears, getValues, selectedProductType, setValue]);

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
    if (!selectedImageFile && initialImages.length === 0) {
      setImageValidationError('Product image is required.');
      return;
    }

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

  const interiorDropdownOptions: ProductFormDropdownOption[] = filteredInteriorSurfaceTypes.map(surfaceType => ({
    id: surfaceType.id,
    label: surfaceType.name,
  }));

  const exteriorDropdownOptions: ProductFormDropdownOption[] = filteredExteriorSurfaceTypes.map(surfaceType => ({
    id: surfaceType.id,
    label: surfaceType.name,
  }));

  const basecoatDropdownOptions: ProductFormDropdownOption[] = filteredBasecoatOptions.map(basecoat => ({
    id: basecoat.id,
    label: basecoat.name,
    meta: `${basecoat.warrantyYears} years`,
  }));

  const toggleDropdown = (dropdown: ProductFormDropdown): void => {
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

  return {
    register,
    control,
    handleSubmit,
    errors,
    selectedProductType,
    selectedSurfaceTypeIds,
    selectedBasecoatIds,
    interiorSurfaceSearch,
    exteriorSurfaceSearch,
    linkedBasecoatSearch,
    activeDropdown,
    selectedImageFile,
    imageValidationError,
    interiorSelectedCount,
    exteriorSelectedCount,
    interiorDropdownOptions,
    exteriorDropdownOptions,
    basecoatDropdownOptions,
    setInteriorSurfaceSearch,
    setExteriorSurfaceSearch,
    setLinkedBasecoatSearch,
    toggleDropdown,
    toggleSurfaceSelection,
    toggleBasecoatSelection,
    handleImageFilesChange,
    handleRemoveCurrentImage,
    handleFormSubmit,
  };
};
