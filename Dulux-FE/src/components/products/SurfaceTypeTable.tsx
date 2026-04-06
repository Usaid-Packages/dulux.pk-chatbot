import type { JSX } from 'react';

import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui';
import type { SurfaceType } from '#/types/products';

interface SurfaceTypeTableProps {
  surfaceTypes: SurfaceType[];
  linkedProductCountMap: Record<number, number>;
  onEdit: (surfaceType: SurfaceType) => void;
  onDelete: (surfaceType: SurfaceType) => void;
}

export const SurfaceTypeTable = ({
  surfaceTypes,
  linkedProductCountMap,
  onEdit,
  onDelete,
}: SurfaceTypeTableProps): JSX.Element => {
  return (
    <div className='wf-card'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Surface Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Linked Products</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {surfaceTypes.map(surfaceType => {
            const linkedCount = linkedProductCountMap[surfaceType.id] ?? 0;
            const handleEditClick = (): void => onEdit(surfaceType);
            const handleDeleteClick = (): void => onDelete(surfaceType);

            return (
              <TableRow key={surfaceType.id}>
                <TableCell className='font-medium text-text-primary'>{surfaceType.name}</TableCell>
                <TableCell>{surfaceType.environment === 'INTERIOR' ? 'Interior' : 'Exterior'}</TableCell>
                <TableCell>{linkedCount}</TableCell>
                <TableCell>{linkedCount > 0 ? 'In Use' : 'Available'}</TableCell>
                <TableCell>
                  <div className='flex items-center gap-2'>
                    <Button type='button' variant='link' className='h-auto p-0' onClick={handleEditClick}>
                      Edit
                    </Button>
                    <Button
                      type='button'
                      variant='link'
                      className='h-auto p-0 text-destructive'
                      onClick={handleDeleteClick}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
