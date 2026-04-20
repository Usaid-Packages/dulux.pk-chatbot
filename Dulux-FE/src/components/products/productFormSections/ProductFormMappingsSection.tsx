import type { JSX } from 'react';

import type { FieldErrors } from 'react-hook-form';

import type { ProductFormSchemaValues } from '#/schemas/products';
import { PRODUCT_TYPES } from '#/types/products';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import type { MultiSelectDropdownOption } from './MultiSelectDropdown';

interface ProductFormMappingsSectionProps {
  errors: FieldErrors<ProductFormSchemaValues>;
  selectedProductType: ProductFormSchemaValues['productType'];
  selectedSurfaceTypeIds: number[];
  selectedBasecoatIds: number[];
  activeDropdown: 'interior' | 'exterior' | 'basecoat' | null;
  interiorSelectedCount: number;
  exteriorSelectedCount: number;
  interiorSurfaceSearch: string;
  exteriorSurfaceSearch: string;
  linkedBasecoatSearch: string;
  interiorDropdownOptions: MultiSelectDropdownOption[];
  exteriorDropdownOptions: MultiSelectDropdownOption[];
  basecoatDropdownOptions: MultiSelectDropdownOption[];
  onToggleDropdown: (dropdown: 'interior' | 'exterior' | 'basecoat') => void;
  onInteriorSurfaceSearchChange: (value: string) => void;
  onExteriorSurfaceSearchChange: (value: string) => void;
  onLinkedBasecoatSearchChange: (value: string) => void;
  onToggleSurfaceSelection: (surfaceTypeId: number, checked: boolean) => void;
  onToggleBasecoatSelection: (basecoatId: number, checked: boolean) => void;
}

/**
 * ProductFormMappingsSection renders surface and basecoat mapping selectors.
 *
 * @param props - Mapping state, dropdown options, and selection/search handlers.
 * @returns Surface and basecoat mapping fieldsets.
 */
export const ProductFormMappingsSection = ({
  errors,
  selectedProductType,
  selectedSurfaceTypeIds,
  selectedBasecoatIds,
  activeDropdown,
  interiorSelectedCount,
  exteriorSelectedCount,
  interiorSurfaceSearch,
  exteriorSurfaceSearch,
  linkedBasecoatSearch,
  interiorDropdownOptions,
  exteriorDropdownOptions,
  basecoatDropdownOptions,
  onToggleDropdown,
  onInteriorSurfaceSearchChange,
  onExteriorSurfaceSearchChange,
  onLinkedBasecoatSearchChange,
  onToggleSurfaceSelection,
  onToggleBasecoatSelection,
}: ProductFormMappingsSectionProps): JSX.Element => {
  return (
    <>
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
            onToggle={() => onToggleDropdown('interior')}
            onSearchChange={onInteriorSurfaceSearchChange}
            onToggleOption={onToggleSurfaceSelection}
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
            onToggle={() => onToggleDropdown('exterior')}
            onSearchChange={onExteriorSurfaceSearchChange}
            onToggleOption={onToggleSurfaceSelection}
          />
        </div>

        {errors.surfaceTypeIds ? <p className='text-xs text-destructive'>{errors.surfaceTypeIds.message}</p> : null}
      </fieldset>

      {selectedProductType === PRODUCT_TYPES.TOPCOAT ? (
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
            onToggle={() => onToggleDropdown('basecoat')}
            onSearchChange={onLinkedBasecoatSearchChange}
            onToggleOption={onToggleBasecoatSelection}
          />
          {errors.basecoatIds ? <p className='text-xs text-destructive'>{errors.basecoatIds.message}</p> : null}
        </fieldset>
      ) : null}
    </>
  );
};
