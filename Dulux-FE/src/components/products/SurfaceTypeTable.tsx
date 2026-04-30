import type { JSX, MouseEvent } from 'react';

import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui';
import type { SurfaceType } from '#/types/products';

interface SurfaceTypeTableProps {
  canManage?: boolean;
  surfaceTypes: SurfaceType[];
  onEdit: (surfaceType: SurfaceType) => void;
  onDelete: (surfaceType: SurfaceType) => void;
}

const SURFACE_TYPE_ACTIONS = {
  DELETE: 'delete',
  EDIT: 'edit',
} as const;

const SURFACE_TYPE_ENVIRONMENT_LABELS: Record<SurfaceType['environment'], string> = {
  INTERIOR: 'Interior',
  EXTERIOR: 'Exterior',
};

const getSurfaceTypeById = (surfaceTypes: SurfaceType[], surfaceTypeId: number): SurfaceType | undefined => {
  return surfaceTypes.find(surfaceType => surfaceType.id === surfaceTypeId);
};

/**
 * SurfaceTypeTable displays surface types and optional management actions for edit/delete.
 *
 * @param props - Surface-type rows, linked-product counts, and row action handlers.
 * @returns Surface type table card content.
 */
export const SurfaceTypeTable = ({
  canManage = true,
  surfaceTypes,
  onEdit,
  onDelete,
}: SurfaceTypeTableProps): JSX.Element => {
  const handleSurfaceTypeActionClick = (event: MouseEvent<HTMLButtonElement>): void => {
    const surfaceTypeId = Number(event.currentTarget.dataset.surfaceTypeId);
    const surfaceTypeAction = event.currentTarget.dataset.surfaceTypeAction;

    if (!Number.isFinite(surfaceTypeId) || !surfaceTypeAction) {
      return;
    }

    const surfaceType = getSurfaceTypeById(surfaceTypes, surfaceTypeId);
    if (!surfaceType) {
      return;
    }

    if (surfaceTypeAction === SURFACE_TYPE_ACTIONS.EDIT) {
      onEdit(surfaceType);
      return;
    }

    if (surfaceTypeAction === SURFACE_TYPE_ACTIONS.DELETE) {
      onDelete(surfaceType);
    }
  };

  return (
    <div className='wf-card wf-card-p4 border-primary/15 bg-white/90 ui-shadow-table'>
      <Table containerClassName='max-h-[62vh] overflow-y-auto overflow-x-auto border-primary/10'>
        <TableHeader>
          <TableRow>
            <TableHead>Surface Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {surfaceTypes.map(surfaceType => {
            return (
              <TableRow key={surfaceType.id}>
                <TableCell className='font-medium text-text-primary'>{surfaceType.name}</TableCell>
                <TableCell>{SURFACE_TYPE_ENVIRONMENT_LABELS[surfaceType.environment]}</TableCell>
                <TableCell className='align-middle'>
                  {canManage ? (
                    <div className='flex items-center gap-2'>
                      <Button
                        type='button'
                        variant='link'
                        className='h-auto p-0'
                        data-surface-type-action={SURFACE_TYPE_ACTIONS.EDIT}
                        data-surface-type-id={surfaceType.id}
                        onClick={handleSurfaceTypeActionClick}
                      >
                        Edit
                      </Button>
                      <Button
                        type='button'
                        variant='link'
                        className='h-auto p-0 text-destructive hover:text-destructive/80'
                        data-surface-type-action={SURFACE_TYPE_ACTIONS.DELETE}
                        data-surface-type-id={surfaceType.id}
                        onClick={handleSurfaceTypeActionClick}
                      >
                        Delete
                      </Button>
                    </div>
                  ) : (
                    <span className='text-xs font-medium text-text-muted'>View only</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
