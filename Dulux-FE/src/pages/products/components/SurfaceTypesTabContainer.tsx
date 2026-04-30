import * as React from 'react';

import { SurfaceTypeTable } from '#/components/products';
import { PaginationFooter } from '#/components/shared';
import {
  Button,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '#/components/ui';
import { SURFACE_ENVIRONMENT_FILTER_VALUES } from '#/constants';
import type { SurfaceType } from '#/types/products';
import type { SurfaceEnvironmentFilter } from '#/utils';

interface SurfaceTypesTabContainerProps {
  surfaceSearch: string;
  surfaceEnvironmentFilter: SurfaceEnvironmentFilter;
  surfacePage: number;
  surfaceTypeTotalPages: number;
  surfaceTypes: SurfaceType[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  hasNextPage: boolean;
  onSurfaceSearchChange: (value: string) => void;
  onSurfaceEnvironmentFilterChange: (value: string) => void;
  onOpenCreateSurfaceTypeModal: () => void;
  onOpenEditSurfaceTypeModal: (surfaceType: SurfaceType) => void;
  onOpenDeleteSurfaceTypeModal: (surfaceType: SurfaceType) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

/**
 * SurfaceTypesTabContainer renders the Surface Types tab filters, table, and pagination controls.
 */
export const SurfaceTypesTabContainer = ({
  surfaceSearch,
  surfaceEnvironmentFilter,
  surfacePage,
  surfaceTypeTotalPages,
  surfaceTypes,
  isLoading,
  isError,
  errorMessage,
  hasNextPage,
  onSurfaceSearchChange,
  onSurfaceEnvironmentFilterChange,
  onOpenCreateSurfaceTypeModal,
  onOpenEditSurfaceTypeModal,
  onOpenDeleteSurfaceTypeModal,
  onPreviousPage,
  onNextPage,
}: SurfaceTypesTabContainerProps): React.JSX.Element => {
  const handleSurfaceSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    onSurfaceSearchChange(event.target.value);
  };

  return (
    <>
      <section className='wf-toolbar-panel border-primary/15 bg-white ui-shadow-panel'>
        <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-[2fr_1fr_auto]'>
          <Input
            type='search'
            value={surfaceSearch}
            onChange={handleSurfaceSearchInputChange}
            placeholder='Search by surface name'
            className='h-11 rounded-xl border-primary/25 bg-white'
            aria-label='Search surface types'
          />
          <Select value={surfaceEnvironmentFilter} onValueChange={onSurfaceEnvironmentFilterChange}>
            <SelectTrigger aria-label='Filter surface types by category'>
              <SelectValue placeholder='Category: All' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SURFACE_ENVIRONMENT_FILTER_VALUES.ALL}>Category: All</SelectItem>
              <SelectItem value={SURFACE_ENVIRONMENT_FILTER_VALUES.INTERIOR}>Interior</SelectItem>
              <SelectItem value={SURFACE_ENVIRONMENT_FILTER_VALUES.EXTERIOR}>Exterior</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type='button'
            className='h-10 rounded-xl border border-[#0b1f3a] bg-[#0b1f3a] text-white shadow-[0_12px_24px_rgba(8,24,46,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#08182e] hover:shadow-[0_16px_30px_rgba(8,24,46,0.45)]'
            onClick={onOpenCreateSurfaceTypeModal}
          >
            Add Surface Type
          </Button>
        </div>
      </section>

      {isLoading ? (
        <section className='space-y-2 wf-card wf-card-p4'>
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
        </section>
      ) : null}

      {isError ? (
        <Empty>
          <EmptyContent>
            <EmptyHeader>
              <EmptyTitle>Failed to load surface types</EmptyTitle>
              <EmptyDescription>{errorMessage}</EmptyDescription>
            </EmptyHeader>
          </EmptyContent>
        </Empty>
      ) : null}

      {!isLoading && !isError && surfaceTypes.length === 0 ? (
        <Empty>
          <EmptyContent>
            <EmptyHeader>
              <EmptyTitle>No surface types found</EmptyTitle>
              <EmptyDescription>Add a surface type to continue.</EmptyDescription>
            </EmptyHeader>
          </EmptyContent>
        </Empty>
      ) : null}

      {!isLoading && !isError && surfaceTypes.length > 0 ? (
        <>
          <SurfaceTypeTable
            surfaceTypes={surfaceTypes}
            onEdit={onOpenEditSurfaceTypeModal}
            onDelete={onOpenDeleteSurfaceTypeModal}
          />

          <PaginationFooter
            currentPage={surfacePage}
            totalPages={surfaceTypeTotalPages}
            disablePrevious={surfacePage <= 1}
            disableNext={!hasNextPage}
            onPreviousPage={onPreviousPage}
            onNextPage={onNextPage}
          />
        </>
      ) : null}
    </>
  );
};
